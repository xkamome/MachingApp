const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, getPhase, setPhase, addAuditLog } = require('../db');
const { sendAllMatchEmails } = require('../emailService');

const router = express.Router();
const VALID_PHASES = ['setup', 'voting', 'locked', 'revealed'];

function adminAuth(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (!pwd || pwd !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(adminAuth);

// GET /api/admin/participants
router.get('/participants', async (req, res) => {
  try {
    const rows = await db.execute(`
      SELECT
        p.id, p.name, p.group_name, p.bio, p.photo, p.access_code,
        c.chosen_id,
        cp.name as chosen_name
      FROM participants p
      LEFT JOIN choices c ON p.id = c.chooser_id
      LEFT JOIN participants cp ON c.chosen_id = cp.id
      ORDER BY p.group_name, p.name
    `);
    res.json(rows.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/participants
router.post('/participants', async (req, res) => {
  try {
    const { name, group_name, bio, photo, access_code } = req.body;
    if (!name || !group_name) {
      return res.status(400).json({ error: 'name and group_name required' });
    }
    if (!['A', 'B'].includes(group_name)) {
      return res.status(400).json({ error: 'group_name must be A or B' });
    }
    // access_code 選填，若未提供則自動產生
    const code = access_code || uuidv4().slice(0, 8);
    const dup = await db.execute({ sql: 'SELECT id FROM participants WHERE access_code = ?', args: [code] });
    if (dup.rows.length > 0) return res.status(409).json({ error: 'access_code already exists' });

    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO participants (id, name, group_name, bio, photo, access_code) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name, group_name, bio || '', photo || '', code],
    });

    await addAuditLog('add_participant', id, `Added ${name} to group ${group_name}`);
    res.json({ id, name, group_name, bio, photo, access_code: code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/participants/:id
router.put('/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bio, photo, access_code } = req.body;
    const existing = await db.execute({ sql: 'SELECT id FROM participants WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    if (access_code) {
      const dup = await db.execute({
        sql: 'SELECT id FROM participants WHERE access_code = ? AND id != ?',
        args: [access_code, id],
      });
      if (dup.rows.length > 0) return res.status(409).json({ error: 'access_code already exists' });
    }

    await db.execute({
      sql: `UPDATE participants SET
        name = COALESCE(?, name),
        bio = COALESCE(?, bio),
        photo = COALESCE(?, photo),
        access_code = COALESCE(?, access_code)
      WHERE id = ?`,
      args: [name || null, bio !== undefined ? bio : null, photo !== undefined ? photo : null, access_code || null, id],
    });

    await addAuditLog('update_participant', id, `Updated ${id}`);
    const updated = await db.execute({ sql: 'SELECT id, name, group_name, bio, photo, access_code FROM participants WHERE id = ?', args: [id] });
    res.json(updated.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/participants/:id
router.delete('/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const p = await db.execute({ sql: 'SELECT name FROM participants WHERE id = ?', args: [id] });
    if (p.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    // 先刪選擇記錄
    await db.execute({ sql: 'DELETE FROM choices WHERE chooser_id = ? OR chosen_id = ?', args: [id, id] });
    await db.execute({ sql: 'DELETE FROM participants WHERE id = ?', args: [id] });
    await addAuditLog('delete_participant', id, `Deleted ${p.rows[0].name}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/choice/:id
router.delete('/choice/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const choice = await db.execute({ sql: 'SELECT chooser_id FROM choices WHERE chooser_id = ?', args: [id] });
    if (choice.rows.length === 0) return res.status(404).json({ error: 'No choice found' });

    await db.execute({ sql: 'DELETE FROM choices WHERE chooser_id = ?', args: [id] });
    await addAuditLog('reset_choice', id, `Reset choice for participant ${id}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/phase
router.post('/phase', async (req, res) => {
  try {
    const { phase } = req.body;
    if (!VALID_PHASES.includes(phase)) {
      return res.status(400).json({ error: `phase must be one of: ${VALID_PHASES.join(', ')}` });
    }
    const prev = await getPhase();
    await setPhase(phase);
    await addAuditLog('change_phase', null, `${prev} → ${phase}`);

    // Phase 變為 revealed 時，自動寄配對結果 email 給所有配對成功的人
    if (phase === 'revealed' && prev !== 'revealed') {
      // 非同步寄信，不阻塞 HTTP 回應
      sendAllMatchEmails().catch(e => console.error('[Email] 寄信流程錯誤:', e.message));
    }

    res.json({ ok: true, phase });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/preview/:id
router.get('/preview/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const meRes = await db.execute({ sql: 'SELECT id, name, group_name, bio, photo FROM participants WHERE id = ?', args: [id] });
    const me = meRes.rows[0];
    if (!me) return res.status(404).json({ error: 'Not found' });

    const myChoiceRes = await db.execute({ sql: 'SELECT chosen_id FROM choices WHERE chooser_id = ?', args: [id] });
    const myChoice = myChoiceRes.rows[0];
    if (!myChoice) return res.json({ matched: false, reason: 'no_choice', me });

    const theirChoiceRes = await db.execute({ sql: 'SELECT chosen_id FROM choices WHERE chooser_id = ?', args: [myChoice.chosen_id] });
    const theirChoice = theirChoiceRes.rows[0];
    const matched = theirChoice?.chosen_id === id;

    const partnerRes = await db.execute({ sql: 'SELECT id, name, group_name, bio, photo FROM participants WHERE id = ?', args: [myChoice.chosen_id] });
    const partner = partnerRes.rows[0];

    res.json({ matched, me, partner, preview: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/audit-log
router.get('/audit-log', async (req, res) => {
  try {
    const logs = await db.execute('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200');
    res.json(logs.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const phase = await getPhase();
    const totalA = Number((await db.execute("SELECT COUNT(*) as n FROM participants WHERE group_name = 'A'")).rows[0].n);
    const totalB = Number((await db.execute("SELECT COUNT(*) as n FROM participants WHERE group_name = 'B'")).rows[0].n);
    const votedA = Number((await db.execute(`
      SELECT COUNT(*) as n FROM choices c
      JOIN participants p ON c.chooser_id = p.id
      WHERE p.group_name = 'A'
    `)).rows[0].n);
    const votedB = Number((await db.execute(`
      SELECT COUNT(*) as n FROM choices c
      JOIN participants p ON c.chooser_id = p.id
      WHERE p.group_name = 'B'
    `)).rows[0].n);
    const mutualMatches = Number((await db.execute(`
      SELECT COUNT(*) as n FROM choices c1
      JOIN choices c2 ON c1.chosen_id = c2.chooser_id AND c2.chosen_id = c1.chooser_id
      JOIN participants p ON c1.chooser_id = p.id
      WHERE p.group_name = 'A'
    `)).rows[0].n);

    res.json({ phase, totalA, totalB, votedA, votedB, mutualMatches });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/batch-participants
router.post('/batch-participants', async (req, res) => {
  try {
    const { participants } = req.body;
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'participants must be a non-empty array' });
    }

    const inserted = [];
    const errors = [];

    for (const item of participants) {
      const { name, group_name, bio, photo, access_code } = item;
      if (!name || !group_name) {
        errors.push({ item, error: 'name and group_name required' });
        continue;
      }
      if (!['A', 'B'].includes(group_name)) {
        errors.push({ item, error: 'group_name must be A or B' });
        continue;
      }
      const code = access_code || uuidv4().slice(0, 8);
      const dup = await db.execute({ sql: 'SELECT id FROM participants WHERE access_code = ?', args: [code] });
      if (dup.rows.length > 0) {
        errors.push({ item, error: `access_code ${code} already exists` });
        continue;
      }
      const id = uuidv4();
      await db.execute({
        sql: 'INSERT INTO participants (id, name, group_name, bio, photo, access_code) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, name, group_name, bio || '', photo || '', code],
      });
      inserted.push({ id, name, group_name, access_code: code });
    }

    await addAuditLog('batch_add', null, `Batch added ${inserted.length} participants`);
    res.json({ inserted, errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
