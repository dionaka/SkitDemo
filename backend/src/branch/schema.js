const db = require('../db');

function migrateBranchSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branch_demo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      series_id INTEGER,
      root_node_id INTEGER,
      status INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (series_id) REFERENCES series(id)
    );

    CREATE TABLE IF NOT EXISTS branch_node (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demo_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      node_type TEXT NOT NULL DEFAULT 'segment',
      asset_spec TEXT NOT NULL,
      branch_at REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (demo_id) REFERENCES branch_demo(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS branch_choice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demo_id INTEGER NOT NULL,
      from_node_id INTEGER NOT NULL,
      option_label TEXT NOT NULL,
      option_desc TEXT,
      to_node_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (demo_id) REFERENCES branch_demo(id) ON DELETE CASCADE,
      FOREIGN KEY (from_node_id) REFERENCES branch_node(id) ON DELETE CASCADE,
      FOREIGN KEY (to_node_id) REFERENCES branch_node(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS branch_user_path (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demo_id INTEGER NOT NULL,
      user_session_id TEXT NOT NULL,
      choice_id INTEGER,
      from_node_id INTEGER NOT NULL,
      to_node_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (demo_id) REFERENCES branch_demo(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_branch_point (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      title TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (video_id) REFERENCES video(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_branch_choice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_point_id INTEGER NOT NULL,
      option_label TEXT NOT NULL,
      option_desc TEXT,
      asset_spec TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (branch_point_id) REFERENCES video_branch_point(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_branch_user_pick (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_point_id INTEGER NOT NULL,
      choice_id INTEGER NOT NULL,
      user_session_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (branch_point_id) REFERENCES video_branch_point(id) ON DELETE CASCADE,
      FOREIGN KEY (choice_id) REFERENCES video_branch_choice(id) ON DELETE CASCADE
    );
  `);

  const demoCols = db.prepare('PRAGMA table_info(branch_demo)').all().map((c) => c.name);
  if (!demoCols.includes('video_id')) {
    db.exec('ALTER TABLE branch_demo ADD COLUMN video_id INTEGER REFERENCES video(id)');
  }
}

module.exports = { migrateBranchSchema };
