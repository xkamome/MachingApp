const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = createClient({
  url: `file:${path.join(dataDir, 'matching.db')}`,
});

// 初始化 Schema
async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      group_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      access_code TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS choices (
      chooser_id TEXT PRIMARY KEY,
      chosen_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      phase TEXT NOT NULL DEFAULT 'setup',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_id TEXT,
      admin_note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 確保 event_state 有一筆資料
  const state = await db.execute('SELECT id FROM event_state WHERE id = 1');
  if (state.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO event_state (id, phase, updated_at) VALUES (1, ?, ?)',
      args: ['setup', new Date().toISOString()],
    });
  }

  // Migration: add email column to choices if not exists
  try {
    await db.execute('ALTER TABLE choices ADD COLUMN email TEXT DEFAULT ""');
  } catch (_) { /* column already exists */ }
}

async function getPhase() {
  const res = await db.execute('SELECT phase FROM event_state WHERE id = 1');
  return res.rows[0]?.phase || 'setup';
}

async function setPhase(phase) {
  await db.execute({
    sql: 'UPDATE event_state SET phase = ?, updated_at = ? WHERE id = 1',
    args: [phase, new Date().toISOString()],
  });
}

async function addAuditLog(action, targetId, adminNote) {
  await db.execute({
    sql: 'INSERT INTO audit_log (action, target_id, admin_note, created_at) VALUES (?, ?, ?, ?)',
    args: [action, targetId || null, adminNote || null, new Date().toISOString()],
  });
}

// 初始化（在 index.js 中 await）
const ready = initDb();

module.exports = { db, ready, getPhase, setPhase, addAuditLog };
