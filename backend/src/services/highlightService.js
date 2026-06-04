const db = require('../db');
const aiModelService = require('./aiModelService');
const videoService = require('./videoService');
const path = require('path');
const config = require('../config');

function mapHighlightRow(h) {
  if (!h) return null;
  return {
    ...h,
    options: JSON.parse(h.options),
    source: h.source || 'ai_video',
    status: h.status || 'active',
    danmaku_density: h.danmaku_density ?? null,
    confidence: h.confidence ?? null,
    merged_into_id: h.merged_into_id ?? null,
  };
}

class HighlightService {
  listByVideoId(videoId, { includeArchived = false } = {}) {
    let sql = 'SELECT * FROM highlight WHERE video_id = ?';
    if (!includeArchived) {
      sql += " AND status = 'active' AND merged_into_id IS NULL";
    }
    sql += ' ORDER BY timestamp ASC';
    const list = db.prepare(sql).all(videoId);
    return list.map(mapHighlightRow);
  }

  getById(id) {
    const h = db.prepare('SELECT * FROM highlight WHERE id = ?').get(id);
    return mapHighlightRow(h);
  }

  create(data) {
    const result = db.prepare(`
      INSERT INTO highlight (
        video_id, timestamp, title, category, interaction_type, options,
        source, status, danmaku_density, confidence, merged_into_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.video_id,
      data.timestamp,
      data.title,
      data.category,
      data.interaction_type || data.category,
      JSON.stringify(data.options),
      data.source || 'manual',
      data.status || 'active',
      data.danmaku_density ?? null,
      data.confidence ?? null,
      data.merged_into_id ?? null,
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
      source: data.source ?? existing.source,
      status: data.status ?? existing.status,
      danmaku_density: data.danmaku_density ?? existing.danmaku_density,
      confidence: data.confidence ?? existing.confidence,
      merged_into_id: data.merged_into_id ?? existing.merged_into_id,
    };

    db.prepare(`
      UPDATE highlight SET
        timestamp=?, title=?, category=?, interaction_type=?, options=?,
        source=?, status=?, danmaku_density=?, confidence=?, merged_into_id=?
      WHERE id=?
    `).run(
      updated.timestamp,
      updated.title,
      updated.category,
      updated.interaction_type,
      JSON.stringify(updated.options),
      updated.source,
      updated.status,
      updated.danmaku_density,
      updated.confidence,
      updated.merged_into_id,
      id,
    );

    return this.getById(id);
  }

  delete(id) {
    const result = db.prepare('DELETE FROM highlight WHERE id = ?').run(id);
    return result.changes > 0;
  }

  archive(id, mergedIntoId = null) {
    return this.update(id, {
      status: 'archived',
      merged_into_id: mergedIntoId,
    });
  }

  async analyzeVideo(videoId) {
    const video = videoService.getById(videoId);
    if (!video) throw new Error('视频不存在');

    const videoPath = path.join(
      config.uploadBasePath,
      video.video_url.replace('/uploads/', ''),
    );

    const result = await aiModelService.analyzeVideo(videoPath, video.total_duration);
    const { highlights, source, reason } = result;

    db.prepare(`
      DELETE FROM highlight WHERE video_id = ? AND source = 'ai_video' AND status != 'archived'
    `).run(videoId);

    const saved = highlights.map((h) =>
      this.create({
        video_id: videoId,
        timestamp: h.timestamp,
        title: h.title,
        category: h.category,
        interaction_type: h.category,
        options: h.options,
        source: 'ai_video',
        status: 'active',
      }),
    );

    return { highlights: saved, source, reason };
  }
}

module.exports = new HighlightService();
