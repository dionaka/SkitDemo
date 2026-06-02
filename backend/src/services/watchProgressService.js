const db = require('../db');
const seriesService = require('./seriesService');

const MIN_RESUME_SECONDS = 5;
/** 首次写入继续观看至少要看这么多秒，避免误触/预加载产生脏数据 */
const MIN_NEW_ENTRY_SECONDS = 8;
const COMPLETE_RATIO = 0.95;
const SHORT_VIDEO_MAX_SECONDS = 30;
/** 只有相对「上次计时的进度锚点」往前看了这么多秒，才刷新最近观看时间 */
const ADVANCE_SECONDS = 3;

function isEligibleForContinue(positionSeconds, totalDuration) {
  const pos = Number(positionSeconds) || 0;
  if (pos < MIN_RESUME_SECONDS) return false;

  const total = Number(totalDuration) || 0;
  if (total <= 0) return true;
  // 短视频看完仍保留在「继续观看」，便于最近看过排序
  if (total <= SHORT_VIDEO_MAX_SECONDS) return true;
  return pos < total * COMPLETE_RATIO;
}

/** 过滤从未真正看过的脏记录（误触、预加载、旧版逻辑残留） */
function hasMeaningfulWatch(positionSeconds, watchAnchorSeconds, totalDuration) {
  const pos = Number(positionSeconds) || 0;
  if (pos < MIN_NEW_ENTRY_SECONDS) return false;
  const total = Number(totalDuration) || 0;
  // 短视频看过 8 秒以上即视为有效观看
  if (total > 0 && total <= SHORT_VIDEO_MAX_SECONDS) return true;
  const anchor = Number(watchAnchorSeconds) || 0;
  if (anchor <= MIN_NEW_ENTRY_SECONDS) return true;
  return pos - anchor >= ADVANCE_SECONDS;
}

class WatchProgressService {
  save(userSessionId, videoId, positionSeconds, options = {}) {
    const { bumpTime = false } = options;
    const position = Math.max(0, Number(positionSeconds) || 0);
    if (position < 1) {
      return { video_id: Number(videoId), position_seconds: 0 };
    }

    const existing = this.get(userSessionId, videoId);
    const prev = existing ? Number(existing.position_seconds) || 0 : 0;
    const anchor = existing
      ? Number(existing.watch_anchor_seconds ?? existing.position_seconds) || 0
      : 0;
    const nextPosition = Math.max(prev, position);
    const shouldBumpTime = bumpTime || position - anchor >= ADVANCE_SECONDS;

    if (existing) {
      if (shouldBumpTime) {
        db.prepare(`
          UPDATE watch_progress
          SET position_seconds = ?, watch_anchor_seconds = ?, updated_at = datetime('now')
          WHERE user_session_id = ? AND video_id = ?
        `).run(nextPosition, nextPosition, userSessionId, videoId);
      } else if (nextPosition > prev) {
        db.prepare(`
          UPDATE watch_progress
          SET position_seconds = ?
          WHERE user_session_id = ? AND video_id = ?
        `).run(nextPosition, userSessionId, videoId);
      }
    } else if (nextPosition >= MIN_NEW_ENTRY_SECONDS && shouldBumpTime) {
      db.prepare(`
        INSERT INTO watch_progress (user_session_id, video_id, position_seconds, watch_anchor_seconds, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(userSessionId, videoId, nextPosition, nextPosition);
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
      'SELECT video_id, position_seconds, watch_anchor_seconds, updated_at FROM watch_progress WHERE user_session_id = ?'
    ).all(fromSessionId);

    const upsert = db.prepare(`
      INSERT INTO watch_progress (user_session_id, video_id, position_seconds, watch_anchor_seconds, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_session_id, video_id) DO UPDATE SET
        position_seconds = CASE
          WHEN excluded.position_seconds > watch_progress.position_seconds THEN excluded.position_seconds
          ELSE watch_progress.position_seconds
        END,
        watch_anchor_seconds = CASE
          WHEN excluded.position_seconds > watch_progress.position_seconds THEN excluded.watch_anchor_seconds
          WHEN watch_progress.position_seconds > excluded.position_seconds THEN watch_progress.watch_anchor_seconds
          ELSE MAX(watch_progress.watch_anchor_seconds, excluded.watch_anchor_seconds)
        END,
        updated_at = CASE
          WHEN excluded.position_seconds > watch_progress.position_seconds THEN excluded.updated_at
          WHEN watch_progress.position_seconds > excluded.position_seconds THEN watch_progress.updated_at
          WHEN excluded.updated_at > watch_progress.updated_at THEN excluded.updated_at
          ELSE watch_progress.updated_at
        END
    `);

    rows.forEach((row) => {
      const anchor = Number(row.watch_anchor_seconds ?? row.position_seconds) || 0;
      upsert.run(toSessionId, row.video_id, row.position_seconds, anchor, row.updated_at);
    });
  }

  removeBySeries(userSessionId, seriesId) {
    const videoIds = db.prepare(
      'SELECT id FROM video WHERE series_id = ?'
    ).all(seriesId).map((row) => row.id);

    if (videoIds.length === 0) {
      return { deleted: 0, video_ids: [] };
    }

    const placeholders = videoIds.map(() => '?').join(',');
    const result = db.prepare(`
      DELETE FROM watch_progress
      WHERE user_session_id = ? AND video_id IN (${placeholders})
    `).run(userSessionId, ...videoIds);

    return { deleted: result.changes, video_ids: videoIds };
  }

  clearAll(userSessionId) {
    const videoIds = db.prepare(
      'SELECT video_id FROM watch_progress WHERE user_session_id = ?'
    ).all(userSessionId).map((row) => row.video_id);

    const result = db.prepare(
      'DELETE FROM watch_progress WHERE user_session_id = ?'
    ).run(userSessionId);

    return { deleted: result.changes, video_ids: videoIds };
  }

  getContinueList(userSessionId, limit = 10) {
    // 按剧集聚合：每部剧只取 updated_at 最新的一集，避免多集轮流顶到前面
    const rows = db.prepare(`
      SELECT wp.position_seconds, wp.updated_at, wp.watch_anchor_seconds,
        v.id as video_id, v.title, v.episode_number, v.total_duration, v.series_id,
        s.title as series_title, s.cover_url as series_cover_url
      FROM watch_progress wp
      JOIN video v ON v.id = wp.video_id AND v.status = 1
      JOIN series s ON s.id = v.series_id
      JOIN (
        SELECT v2.series_id, MAX(wp2.updated_at) AS series_updated_at
        FROM watch_progress wp2
        JOIN video v2 ON v2.id = wp2.video_id AND v2.status = 1
        WHERE wp2.user_session_id = ?
          AND wp2.position_seconds >= ?
        GROUP BY v2.series_id
      ) latest ON latest.series_id = v.series_id AND latest.series_updated_at = wp.updated_at
      WHERE wp.user_session_id = ?
        AND wp.position_seconds >= ?
      ORDER BY wp.updated_at DESC, wp.id DESC
    `).all(
      userSessionId,
      MIN_NEW_ENTRY_SECONDS,
      userSessionId,
      MIN_NEW_ENTRY_SECONDS,
    );

    const seenSeries = new Set();
    const list = [];
    for (const item of rows) {
      if (!hasMeaningfulWatch(item.position_seconds, item.watch_anchor_seconds, item.total_duration)) continue;
      if (!isEligibleForContinue(item.position_seconds, item.total_duration)) continue;
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
