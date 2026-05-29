const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');

class VideoService {
  listPublished(page = 1, size = 10) {
    const offset = (page - 1) * size;
    const total = db.prepare('SELECT COUNT(*) as c FROM video WHERE status = 1').get().c;
    const list = db.prepare(`
      SELECT v.*, s.title as series_title,
        (SELECT COUNT(*) FROM highlight h WHERE h.video_id = v.id) as highlight_count
      FROM video v
      LEFT JOIN series s ON s.id = v.series_id
      WHERE v.status = 1
      ORDER BY s.title ASC, v.episode_number ASC, v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(size, offset);

    return { total, page, size, list };
  }

  listAll() {
    return db.prepare(`
      SELECT v.*, s.title as series_title,
        (SELECT COUNT(*) FROM highlight h WHERE h.video_id = v.id) as highlight_count
      FROM video v
      LEFT JOIN series s ON s.id = v.series_id
      ORDER BY s.title ASC, v.episode_number ASC, v.created_at DESC
    `).all();
  }

  getById(id) {
    const video = db.prepare('SELECT * FROM video WHERE id = ?').get(id);
    if (!video) return null;
    const series = video.series_id
      ? db.prepare('SELECT * FROM series WHERE id = ?').get(video.series_id)
      : null;
    return { ...video, series_title: series?.title || null };
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

  create({ title, coverUrl, videoUrl, totalDuration, seriesId, episodeNumber }) {
    const result = db.prepare(`
      INSERT INTO video (title, cover_url, video_url, total_duration, status, series_id, episode_number)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(
      title,
      coverUrl,
      videoUrl,
      totalDuration || 0,
      seriesId,
      episodeNumber || 1
    );

    db.prepare('UPDATE series SET updated_at = datetime(\'now\') WHERE id = ?').run(seriesId);
    return this.getById(result.lastInsertRowid);
  }

  publish(id) {
    db.prepare('UPDATE video SET status = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
    const video = this.getById(id);
    if (video?.series_id) {
      db.prepare('UPDATE series SET updated_at = datetime(\'now\') WHERE id = ?').run(video.series_id);
    }
    return video;
  }

  update(id, { title, seriesId, episodeNumber, totalDuration }) {
    const existing = this.getById(id);
    if (!existing) return null;

    const oldSeriesId = existing.series_id;
    db.prepare(`
      UPDATE video SET
        title = ?,
        series_id = ?,
        episode_number = ?,
        total_duration = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title ?? existing.title,
      seriesId ?? existing.series_id,
      episodeNumber ?? existing.episode_number,
      totalDuration ?? existing.total_duration,
      id
    );

    if (oldSeriesId) {
      db.prepare('UPDATE series SET updated_at = datetime(\'now\') WHERE id = ?').run(oldSeriesId);
    }
    if (seriesId && seriesId !== oldSeriesId) {
      db.prepare('UPDATE series SET updated_at = datetime(\'now\') WHERE id = ?').run(seriesId);
    }

    return this.getById(id);
  }

  remove(id) {
    const video = this.getById(id);
    if (!video) return false;

    const result = db.prepare('DELETE FROM video WHERE id = ?').run(id);
    if (result.changes === 0) return false;

    this.deleteLocalFile(video.video_url);
    if (video.cover_url && !video.cover_url.includes('default-cover')) {
      this.deleteLocalFile(video.cover_url);
    }
    return true;
  }

  deleteLocalFile(urlPath) {
    if (!urlPath || !urlPath.startsWith('/uploads/')) return;
    const relative = urlPath.replace(/^\/uploads\//, '');
    const fullPath = path.join(config.uploadBasePath, relative);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (err) {
      console.warn('删除本地文件失败:', fullPath, err.message);
    }
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
