const db = require('../db');
const seriesService = require('./seriesService');

const MIN_RESUME_SECONDS = 5;
const COMPLETE_RATIO = 0.95;
/** 只有真正往前看了这么多秒，才刷新「最近观看」时间 */
const ADVANCE_SECONDS = 3;

class WatchProgressService {
  save(userSessionId, videoId, positionSeconds) {
    const position = Math.max(0, Number(positionSeconds) || 0);
    const existing = this.get(userSessionId, videoId);
    const prev = existing ? Number(existing.position_seconds) || 0 : 0;
    const nextPosition = Math.max(prev, position);
    const advanced = position - prev >= ADVANCE_SECONDS;

    if (existing) {
      if (advanced) {
        db.prepare(`
          UPDATE watch_progress
          SET position_seconds = ?, updated_at = datetime('now')
          WHERE user_session_id = ? AND video_id = ?
        `).run(nextPosition, userSessionId, videoId);
      } else if (nextPosition > prev) {
        db.prepare(`
          UPDATE watch_progress
          SET position_seconds = ?
          WHERE user_session_id = ? AND video_id = ?
        `).run(nextPosition, userSessionId, videoId);
      }
    } else if (nextPosition >= MIN_RESUME_SECONDS) {
      db.prepare(`
        INSERT INTO watch_progress (user_session_id, video_id, position_seconds, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(userSessionId, videoId, nextPosition);
    }

    return { video_id: Number(videoId), position_seconds: nextPosition };
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
      'SELECT video_id, position_seconds, updated_at FROM watch_progress WHERE user_session_id = ?'
    ).all(fromSessionId);

    const upsert = db.prepare(`
      INSERT INTO watch_progress (user_session_id, video_id, position_seconds, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_session_id, video_id) DO UPDATE SET
        position_seconds = CASE
          WHEN excluded.position_seconds > watch_progress.position_seconds THEN excluded.position_seconds
          ELSE watch_progress.position_seconds
        END,
        updated_at = CASE
          WHEN excluded.position_seconds > watch_progress.position_seconds THEN excluded.updated_at
          WHEN watch_progress.position_seconds > excluded.position_seconds THEN watch_progress.updated_at
          WHEN excluded.updated_at > watch_progress.updated_at THEN excluded.updated_at
          ELSE watch_progress.updated_at
        END
    `);

    rows.forEach((row) => {
      upsert.run(toSessionId, row.video_id, row.position_seconds, row.updated_at);
    });
  }

  getContinueList(userSessionId, limit = 10) {
    const rows = db.prepare(`
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
    `).all(userSessionId, MIN_RESUME_SECONDS, COMPLETE_RATIO);

    const seenSeries = new Set();
    const list = [];
    for (const item of rows) {
      if (seenSeries.has(item.series_id)) continue;
      seenSeries.add(item.series_id);
      list.push(item);
      if (list.length >= limit) break;
    }

    return list.map((item) => ({
      ...item,
      series_cover_url: seriesService.getById(item.series_id)?.cover_url || item.series_cover_url,
    }));
  }
}

module.exports = new WatchProgressService();
