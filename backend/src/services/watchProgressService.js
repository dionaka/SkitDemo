const db = require('../db');
const { getSeriesCoverUrlById } = require('../utils/seriesCover');

const MIN_RESUME_SECONDS = 5;
/** 首次写入继续观看至少要看这么多秒，避免误触产生脏数据 */
const MIN_NEW_ENTRY_SECONDS = 5;
const COMPLETE_RATIO = 0.95;
/** 总时长不超过此值的短剧，看完后仍保留在继续观看 */
const SHORT_FORM_MAX_SECONDS = 120;
const ADVANCE_SECONDS = 3;

function clampPosition(positionSeconds, totalDuration) {
  const pos = Math.max(0, Number(positionSeconds) || 0);
  const total = Number(totalDuration) || 0;
  if (total > 0) return Math.min(pos, total);
  return pos;
}

function isEligibleForContinue(positionSeconds, totalDuration) {
  const pos = clampPosition(positionSeconds, totalDuration);
  if (pos < MIN_RESUME_SECONDS) return false;

  const total = Number(totalDuration) || 0;
  if (total <= 0) return true;
  if (total <= SHORT_FORM_MAX_SECONDS) return true;
  return pos < total * COMPLETE_RATIO;
}

/** 是否达到继续观看的最低进度（save 已保证新记录至少看够 MIN_NEW_ENTRY_SECONDS） */
function hasMeaningfulWatch(positionSeconds) {
  return (Number(positionSeconds) || 0) >= MIN_NEW_ENTRY_SECONDS;
}

class WatchProgressService {
  resolveVideoDuration(videoId) {
    const videoService = require('./videoService');
    const video = videoService.getById(videoId);
    return Number(video?.total_duration) || 0;
  }

  clampProgressForVideo(videoId, totalDuration) {
    const total = Math.max(1, Math.round(Number(totalDuration) || 0));
    db.prepare(`
      UPDATE watch_progress
      SET position_seconds = MIN(position_seconds, ?),
          watch_anchor_seconds = MIN(watch_anchor_seconds, ?)
      WHERE video_id = ? AND position_seconds > ?
    `).run(total, total, videoId, total);
  }

  save(userSessionId, videoId, positionSeconds, options = {}) {
    const { bumpTime = false } = options;
    const totalDuration = this.resolveVideoDuration(videoId);
    let position = clampPosition(positionSeconds, totalDuration);
    if (position < 1) {
      return { video_id: Number(videoId), position_seconds: 0 };
    }

    const existing = this.get(userSessionId, videoId);
    const prevRaw = existing ? Number(existing.position_seconds) || 0 : 0;
    const prev = totalDuration > 0 ? Math.min(prevRaw, totalDuration) : prevRaw;
    const anchorRaw = existing
      ? Number(existing.watch_anchor_seconds ?? existing.position_seconds) || 0
      : 0;
    const anchor = totalDuration > 0 ? Math.min(anchorRaw, totalDuration) : anchorRaw;
    let nextPosition = prevRaw > (totalDuration || Infinity) ? position : Math.max(prev, position);
    nextPosition = clampPosition(nextPosition, totalDuration);
    const shouldBumpTime = bumpTime || nextPosition - anchor >= ADVANCE_SECONDS;

    if (existing) {
      if (shouldBumpTime) {
        if (bumpTime) {
          // 暂停/离开：只刷新排序时间，不重置锚点
          db.prepare(`
            UPDATE watch_progress
            SET position_seconds = ?, updated_at = datetime('now')
            WHERE user_session_id = ? AND video_id = ?
          `).run(nextPosition, userSessionId, videoId);
        } else {
          db.prepare(`
            UPDATE watch_progress
            SET position_seconds = ?, watch_anchor_seconds = ?, updated_at = datetime('now')
            WHERE user_session_id = ? AND video_id = ?
          `).run(nextPosition, nextPosition, userSessionId, videoId);
        }
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
      const total = Number(item.total_duration) || 0;
      item.position_seconds = clampPosition(item.position_seconds, total);
      if (!hasMeaningfulWatch(item.position_seconds)) continue;
      if (!isEligibleForContinue(item.position_seconds, item.total_duration)) continue;
      if (seenSeries.has(item.series_id)) continue;
      seenSeries.add(item.series_id);
      list.push(item);
      if (list.length >= limit) break;
    }

    return list.map((item) => ({
      ...item,
      series_cover_url: getSeriesCoverUrlById(item.series_id) || item.series_cover_url,
    }));
  }
}

module.exports = new WatchProgressService();
