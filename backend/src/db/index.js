const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../data/realtimegen.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS video (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      video_url TEXT NOT NULL,
      total_duration INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS highlight (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      interaction_type TEXT NOT NULL,
      options TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_interaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      highlight_id INTEGER NOT NULL,
      user_session_id TEXT NOT NULL,
      selected_option TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (highlight_id) REFERENCES highlight(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const admin = db.prepare('SELECT id FROM admin WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }

  const videoCount = db.prepare('SELECT COUNT(*) as c FROM video').get().c;
  if (videoCount === 0) {
    seedDemoData();
  }
}

function seedDemoData() {
  const insertVideo = db.prepare(`
    INSERT INTO video (title, cover_url, video_url, total_duration, status)
    VALUES (?, ?, ?, ?, 1)
  `);
  const videoId = insertVideo.run(
    '十八岁太奶奶驾到',
    '/uploads/covers/demo-cover.jpg',
    '/uploads/videos/demo.mp4',
    360
  ).lastInsertRowid;

  const insertHighlight = db.prepare(`
    INSERT INTO highlight (video_id, timestamp, title, category, interaction_type, options)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const highlights = [
    [videoId, 45, '身份惊天反转', 'reversal', 'reversal', '["太意外了！", "没想到是这样", "编剧太狠了"]'],
    [videoId, 120, '甜蜜壁咚时刻', 'sweet', 'sweet', '["心跳加速", "太甜了", "齁甜预警"]'],
    [videoId, 200, '激烈冲突对峙', 'conflict', 'conflict', '["太燃了！", "打起来了", "刺激"]'],
    [videoId, 280, '经典名场面', 'scene', 'scene', '["名场面！", "反复观看", "截图留念"]'],
  ];

  highlights.forEach((h) => insertHighlight.run(...h));
}

initDatabase();

module.exports = db;
