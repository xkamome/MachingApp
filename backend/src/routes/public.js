const express = require('express');
const jwt = require('jsonwebtoken');
const { db, getPhase } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'matching_app_secret';

// GET /api/phase
router.get('/phase', async (req, res) => {
  try {
    const phase = await getPhase();
    const total = (await db.execute('SELECT COUNT(*) as n FROM participants')).rows[0].n;
    const voted = (await db.execute('SELECT COUNT(*) as n FROM choices')).rows[0].n;
    res.json({ phase, total: Number(total), voted: Number(voted) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/participants?group=A|B
router.get('/participants', async (req, res) => {
  try {
    const phase = await getPhase();
    if (phase === 'setup') return res.status(403).json({ error: 'Activity not started' });

    const { group } = req.query;
    if (!group || !['A', 'B'].includes(group)) {
      return res.status(400).json({ error: 'group must be A or B' });
    }

    const rows = await db.execute({
      sql: 'SELECT id, name, group_name, bio, photo FROM participants WHERE group_name = ?',
      args: [group],
    });
    res.json(rows.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/login  body: { participant_id }
router.post('/login', async (req, res) => {
  try {
    const phase = await getPhase();
    if (phase === 'setup') return res.status(403).json({ error: 'Activity not started' });

    const { participant_id } = req.body;
    if (!participant_id) return res.status(400).json({ error: 'participant_id required' });

    const result = await db.execute({
      sql: 'SELECT id, name, group_name, bio, photo, email FROM participants WHERE id = ?',
      args: [participant_id],
    });
    const participant = result.rows[0];
    if (!participant) return res.status(404).json({ error: 'Participant not found' });

    const token = jwt.sign({ id: participant.id }, JWT_SECRET, { expiresIn: '24h' });

    const choiceRes = await db.execute({
      sql: 'SELECT chosen_id FROM choices WHERE chooser_id = ?',
      args: [participant.id],
    });
    const choice = choiceRes.rows[0];

    res.json({ token, participant, hasChosen: !!choice, chosenId: choice?.chosen_id || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Middleware: verify JWT
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    const token = header.replace('Bearer ', '');
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/choice  body: { chosen_id, email }
router.post('/choice', auth, async (req, res) => {
  try {
    const phase = await getPhase();
    if (phase !== 'voting') {
      return res.status(403).json({ error: 'Voting is not open' });
    }

    const { chosen_id, email } = req.body;
    if (!chosen_id) return res.status(400).json({ error: 'chosen_id required' });

    const chooserRes = await db.execute({
      sql: 'SELECT id, group_name, email FROM participants WHERE id = ?',
      args: [req.user.id],
    });
    const chosenRes = await db.execute({
      sql: 'SELECT id, group_name FROM participants WHERE id = ?',
      args: [chosen_id],
    });

    const chooser = chooserRes.rows[0];
    const chosen = chosenRes.rows[0];

    if (!chooser || !chosen) return res.status(404).json({ error: 'Participant not found' });
    if (chooser.group_name === chosen.group_name) {
      return res.status(400).json({ error: 'Must choose from the other group' });
    }

    // 使用傳入的 email，或 fallback 到 participants 表預存的 email
    const emailToUse = (email && email.trim()) || chooser.email || '';
    if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      return res.status(400).json({ error: 'email 格式不正確，請輸入有效的 email' });
    }

    const now = new Date().toISOString();
    const existingRes = await db.execute({
      sql: 'SELECT chooser_id FROM choices WHERE chooser_id = ?',
      args: [req.user.id],
    });

    if (existingRes.rows.length > 0) {
      await db.execute({
        sql: 'UPDATE choices SET chosen_id = ?, email = ?, updated_at = ? WHERE chooser_id = ?',
        args: [chosen_id, emailToUse, now, req.user.id],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO choices (chooser_id, chosen_id, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [req.user.id, chosen_id, emailToUse, now, now],
      });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/my-result
router.get('/my-result', auth, async (req, res) => {
  try {
    const phase = await getPhase();
    if (phase !== 'revealed') return res.status(403).json({ error: 'Results not revealed yet' });

    const myId = req.user.id;
    const meRes = await db.execute({
      sql: 'SELECT id, name, group_name, bio, photo FROM participants WHERE id = ?',
      args: [myId],
    });
    const me = meRes.rows[0];
    if (!me) return res.status(404).json({ error: 'Participant not found' });

    const myChoiceRes = await db.execute({
      sql: 'SELECT chosen_id FROM choices WHERE chooser_id = ?',
      args: [myId],
    });
    const myChoice = myChoiceRes.rows[0];

    if (!myChoice) return res.json({ matched: false, reason: 'no_choice', me });

    const theirChoiceRes = await db.execute({
      sql: 'SELECT chosen_id FROM choices WHERE chooser_id = ?',
      args: [myChoice.chosen_id],
    });
    const theirChoice = theirChoiceRes.rows[0];
    const matched = theirChoice?.chosen_id === myId;

    const partnerRes = await db.execute({
      sql: 'SELECT id, name, group_name, bio, photo FROM participants WHERE id = ?',
      args: [myChoice.chosen_id],
    });
    const partner = partnerRes.rows[0];

    // 取得對方填寫的 email（存在對方的 choice 記錄中）
    const partnerEmailRes = await db.execute({
      sql: 'SELECT email FROM choices WHERE chooser_id = ?',
      args: [myChoice.chosen_id],
    });
    const partnerEmail = partnerEmailRes.rows[0]?.email || '';

    res.json({ matched, me, partner: { ...partner, email: partnerEmail } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { router, auth };
