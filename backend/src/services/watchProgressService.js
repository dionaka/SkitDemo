const db = require('../db');
const seriesService = require('./seriesService');

const MIN_RESUME_SECONDS = 5;
const COMPLETE_RATIO = 0.95;

class WatchProgressService {
  save(userSessionId, videoId, positionSeconds) {
    const position = Math.max(0, Number(positionSeconds) || 0);
    db.prepare(`
      INSERT INTO watch_progress (user_session_id, video_id, position_seconds, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_session_id, video_id) DO UPDATE SET
        position_seconds = excluded.position_seconds,
        updated_at = datetime('now')
    `).run(userSessionId, videoId, position);
    return { video_id: Number(videoId), position_seconds: position };
  }

  get(userSessionId, videoId) {
    return db.prepare(
      'SELECT * FROM watch_progress WHERE user_session_id = ? AND video_id = ?'
    ).get(userSessionId, videoId);
  }

  getMapBySession(userSessionId) {
    const rows = db.prepare(
      'SELECT video_id, position_seconds FROM watch_progress WHERE user_session_id = ?'
    ).all(userSessionId);
    const map = {};
    rows.forEach((r) => { map[r.video_id] = r.position_seconds; });
    return map;
  }

  mergeSession(fromSessionId, toSessionId) {
    if (!fromSessionId || !toSessionId || fromSessionId === toSessionId) return;
    const rows = db.prepare(
      'SELECT video_id, position_seconds FROM watch_progress WHERE user_session_id = ?'
    ).all(fromSessionId);

    rows.forEach((row) => {
      const existing = this.get(toSessionId, row.video_id);
      const nextPosition = existing
        ? Math.max(Number(existing.position_seconds) || 0, Number(row.position_seconds) || 0)
        : Number(row.position_seconds) || 0;
      this.save(toSessionId, row.video_id, nextPosition);
    });
  }

  getContinueList(userSessionId, limit = 10) {
    const list = db.prepare(`
      SELECT wp.position_seconds, wp.updated_at,
        v.id as video_id, v.title, v.episode_number, v.total_duration, v.series_id,
        s.title as series_title, s.cover_url as series_cover_url
      FROM watch_progress wp
      JOIN video v ON v.id = wp.video_id AND v.status = 1
      JOIN series s ON s.id = v.series_id
      WHERE wp.user_session_id = ?
        AND wp.position_seconds >= ?
        AND (v.total_duration <= 0 OR wp.position_seconds < v.total_duration * ?)
      ORDER BY wp.updated_at DESC
      LIMIT ?
    `).all(userSessionId, MIN_RESUME_SECONDS, COMPLETE_RATIO, limit);

    return list.map((item) => ({
      ...item,
      series_cover_url: seriesService.getById(item.series_id)?.cover_url || item.series_cover_url,
    }));
  }
}

module.exports = new WatchProgressService();
