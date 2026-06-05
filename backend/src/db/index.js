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
    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cover_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS video (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      video_url TEXT NOT NULL,
      total_duration INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 0,
      series_id INTEGER,
      episode_number INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (series_id) REFERENCES series(id)
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

    CREATE TABLE IF NOT EXISTS watch_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_session_id TEXT NOT NULL,
      video_id INTEGER NOT NULL,
      position_seconds REAL NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_session_id, video_id),
      FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_series_like (
      user_id INTEGER NOT NULL,
      series_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, series_id),
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_series_favorite (
      user_id INTEGER NOT NULL,
      series_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, series_id),
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_comment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
    );
  `);

  migrateSchema();

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

function migrateSchema() {
  const videoCols = db.prepare('PRAGMA table_info(video)').all().map((c) => c.name);
  if (!videoCols.includes('series_id')) {
    db.exec('ALTER TABLE video ADD COLUMN series_id INTEGER');
  }
  if (!videoCols.includes('episode_number')) {
    db.exec('ALTER TABLE video ADD COLUMN episode_number INTEGER NOT NULL DEFAULT 1');
  }

  const orphans = db.prepare('SELECT * FROM video WHERE series_id IS NULL').all();
  orphans.forEach((v) => {
    const existing = db.prepare('SELECT id FROM series WHERE title = ?').get(v.title);
    let seriesId;
    if (existing) {
      seriesId = existing.id;
    } else {
      seriesId = db.prepare('INSERT INTO series (title, cover_url) VALUES (?, ?)')
        .run(v.title, v.cover_url).lastInsertRowid;
    }
    db.prepare(`
      UPDATE video SET series_id = ?, episode_number = COALESCE(episode_number, 1) WHERE id = ?
    `).run(seriesId, v.id);
  });

  const userCols = db.prepare('PRAGMA table_info(app_user)').all().map((c) => c.name);
  if (!userCols.includes('avatar_url')) {
    db.exec('ALTER TABLE app_user ADD COLUMN avatar_url TEXT');
  }
  if (!userCols.includes('updated_at')) {
    db.exec('ALTER TABLE app_user ADD COLUMN updated_at TEXT');
    db.exec("UPDATE app_user SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL");
  }
  if (!userCols.includes('background_url')) {
    db.exec('ALTER TABLE app_user ADD COLUMN background_url TEXT');
  }
  if (!userCols.includes('background_overlay')) {
    db.exec('ALTER TABLE app_user ADD COLUMN background_overlay INTEGER NOT NULL DEFAULT 55');
  }
  if (!userCols.includes('background_blur')) {
    db.exec('ALTER TABLE app_user ADD COLUMN background_blur INTEGER NOT NULL DEFAULT 0');
  }
  if (!userCols.includes('skin_data')) {
    db.exec('ALTER TABLE app_user ADD COLUMN skin_data TEXT');
  }

  const watchProgressCols = db.prepare('PRAGMA table_info(watch_progress)').all().map((c) => c.name);
  if (!watchProgressCols.includes('watch_anchor_seconds')) {
    db.exec('ALTER TABLE watch_progress ADD COLUMN watch_anchor_seconds REAL NOT NULL DEFAULT 0');
    db.exec('UPDATE watch_progress SET watch_anchor_seconds = position_seconds');
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_video_comment_video_status
    ON video_comment(video_id, status, created_at DESC)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS video_danmaku (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      position_seconds REAL NOT NULL,
      content TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#ffffff',
      status INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_video_danmaku_video_pos
    ON video_danmaku(video_id, status, position_seconds)
  `);

  const highlightCols = db.prepare('PRAGMA table_info(highlight)').all().map((c) => c.name);
  if (!highlightCols.includes('source')) {
    db.exec("ALTER TABLE highlight ADD COLUMN source TEXT NOT NULL DEFAULT 'ai_video'");
  }
  if (!highlightCols.includes('status')) {
    db.exec("ALTER TABLE highlight ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  }
  if (!highlightCols.includes('danmaku_density')) {
    db.exec('ALTER TABLE highlight ADD COLUMN danmaku_density INTEGER');
  }
  if (!highlightCols.includes('confidence')) {
    db.exec('ALTER TABLE highlight ADD COLUMN confidence REAL');
  }
  if (!highlightCols.includes('merged_into_id')) {
    db.exec('ALTER TABLE highlight ADD COLUMN merged_into_id INTEGER');
  }
  if (!highlightCols.includes('effect_key')) {
    db.exec('ALTER TABLE highlight ADD COLUMN effect_key TEXT');
  }
  if (!highlightCols.includes('effect_config')) {
    db.exec('ALTER TABLE highlight ADD COLUMN effect_config TEXT');
  }

  db.exec("UPDATE highlight SET source = 'ai_video' WHERE source IS NULL OR source = ''");
  db.exec("UPDATE highlight SET status = 'active' WHERE status IS NULL OR status = ''");
  db.exec("UPDATE highlight SET effect_key = category WHERE effect_key IS NULL OR effect_key = ''");
}

function seedDemoData() {
  const { DEFAULT_COVER_PATH } = require('../utils/defaultCover');
  const seriesId = db.prepare('INSERT INTO series (title, cover_url) VALUES (?, ?)')
    .run('十八岁太奶奶驾到', DEFAULT_COVER_PATH).lastInsertRowid;

  const videoId = db.prepare(`
    INSERT INTO video (title, cover_url, video_url, total_duration, status, series_id, episode_number)
    VALUES (?, ?, ?, ?, 1, ?, 1)
  `).run(
    '第1集',
    DEFAULT_COVER_PATH,
    '/uploads/videos/demo.mp4',
    360,
    seriesId
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
