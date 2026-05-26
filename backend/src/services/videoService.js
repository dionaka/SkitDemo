const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');

class VideoService {
  listPublished(page = 1, size = 10) {
    const offset = (page - 1) * size;
    const total = db.prepare('SELECT COUNT(*) as c FROM video WHERE status = 1').get().c;
    const list = db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM highlight h WHERE h.video_id = v.id) as highlight_count
      FROM video v
      WHERE v.status = 1
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(size, offset);

    return { total, page, size, list };
  }

  listAll() {
    return db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM highlight h WHERE h.video_id = v.id) as highlight_count
      FROM video v ORDER BY v.created_at DESC
    `).all();
  }

  getById(id) {
    return db.prepare('SELECT * FROM video WHERE id = ?').get(id);
  }

  getDetailWithHighlights(id) {
    const video = this.getById(id);
    if (!video) return null;

    const highlights = db.prepare(
      'SELECT * FROM highlight WHERE video_id = ? ORDER BY timestamp ASC'
    ).all(id);

    return {
      video,
      highlights: highlights.map((h) => ({
        ...h,
        options: JSON.parse(h.options),
      })),
    };
  }

  create({ title, coverUrl, videoUrl, totalDuration }) {
    const result = db.prepare(`
      INSERT INTO video (title, cover_url, video_url, total_duration, status)
      VALUES (?, ?, ?, ?, 0)
    `).run(title, coverUrl, videoUrl, totalDuration || 0);

    return this.getById(result.lastInsertRowid);
  }

  publish(id) {
    db.prepare('UPDATE video SET status = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
    return this.getById(id);
  }

  ensureUploadDirs() {
    const dirs = [
      path.join(config.uploadBasePath, 'videos'),
      path.join(config.uploadBasePath, 'covers'),
    ];
    dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }));
    return dirs;
  }

  saveUploadedFile(file, subdir) {
    this.ensureUploadDirs();
    const ext = path.extname(file.originalname) || '.mp4';
    const filename = `${subdir.slice(0, -1)}_${Date.now()}${ext}`;
    const dest = path.join(config.uploadBasePath, subdir, filename);
    fs.renameSync(file.path, dest);
    return `/uploads/${subdir}/${filename}`;
  }
}

module.exports = new VideoService();
