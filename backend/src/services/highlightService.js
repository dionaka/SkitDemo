const db = require('../db');
const aiModelService = require('./aiModelService');
const videoService = require('./videoService');
const path = require('path');
const config = require('../config');

class HighlightService {
  listByVideoId(videoId) {
    const list = db.prepare(
      'SELECT * FROM highlight WHERE video_id = ? ORDER BY timestamp ASC'
    ).all(videoId);
    return list.map((h) => ({ ...h, options: JSON.parse(h.options) }));
  }

  getById(id) {
    const h = db.prepare('SELECT * FROM highlight WHERE id = ?').get(id);
    if (!h) return null;
    return { ...h, options: JSON.parse(h.options) };
  }

  create(data) {
    const result = db.prepare(`
      INSERT INTO highlight (video_id, timestamp, title, category, interaction_type, options)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.video_id,
      data.timestamp,
      data.title,
      data.category,
      data.interaction_type || data.category,
      JSON.stringify(data.options)
    );
    return this.getById(result.lastInsertRowid);
  }

  update(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated = {
      timestamp: data.timestamp ?? existing.timestamp,
      title: data.title ?? existing.title,
      category: data.category ?? existing.category,
      interaction_type: data.interaction_type ?? existing.interaction_type,
      options: data.options ?? existing.options,
    };

    db.prepare(`
      UPDATE highlight SET timestamp=?, title=?, category=?, interaction_type=?, options=?
      WHERE id=?
    `).run(
      updated.timestamp,
      updated.title,
      updated.category,
      updated.interaction_type,
      JSON.stringify(updated.options),
      id
    );

    return this.getById(id);
  }

  delete(id) {
    const result = db.prepare('DELETE FROM highlight WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async analyzeVideo(videoId) {
    const video = videoService.getById(videoId);
    if (!video) throw new Error('视频不存在');

    const videoPath = path.join(
      config.uploadBasePath,
      video.video_url.replace('/uploads/', '')
    );

    const result = await aiModelService.analyzeVideo(videoPath, video.total_duration);
    const { highlights, source, reason } = result;

    db.prepare('DELETE FROM highlight WHERE video_id = ?').run(videoId);

    const saved = highlights.map((h) =>
      this.create({
        video_id: videoId,
        timestamp: h.timestamp,
        title: h.title,
        category: h.category,
        interaction_type: h.category,
        options: h.options,
      })
    );

    return { highlights: saved, source, reason };
  }
}

module.exports = new HighlightService();
