const db = require('../db');
const { getBySessionId } = require('./userAuthService');
const { sanitizeCommentContent } = require('../utils/sanitizeText');
const { assertRateLimit } = require('../utils/rateLimit');

const DANMAKU_MAX_LENGTH = 40;
const PAGE_SIZE_MAX = 100;

function resolveUser(sessionId) {
  if (!sessionId || !String(sessionId).startsWith('user_')) {
    throw new Error('请先登录后再发弹幕');
  }
  const user = getBySessionId(sessionId);
  if (!user) throw new Error('账号无效，请重新登录');
  return user;
}

function ensurePublishedVideo(videoId) {
  const id = Number(videoId);
  if (!Number.isInteger(id) || id < 1) throw new Error('无效的视频 ID');
  const video = db.prepare('SELECT id, status, total_duration FROM video WHERE id = ?').get(id);
  if (!video || video.status !== 1) throw new Error('视频不存在或未发布');
  return video;
}

function mapDanmakuRow(row) {
  return {
    id: row.id,
    video_id: row.video_id,
    position_seconds: row.position_seconds,
    content: row.content,
    color: row.color || '#ffffff',
    created_at: row.created_at,
    user: {
      id: row.user_id,
      username: row.username,
    },
  };
}

class DanmakuService {
  listByVideo(videoId, { from = 0, to = null } = {}) {
    ensurePublishedVideo(videoId);
    const fromSec = Math.max(0, Number(from) || 0);
    let sql = `
      SELECT d.id, d.video_id, d.user_id, d.position_seconds, d.content, d.color, d.created_at,
        u.username
      FROM video_danmaku d
      INNER JOIN app_user u ON u.id = d.user_id
      WHERE d.video_id = ? AND d.status = 1 AND d.position_seconds >= ?
    `;
    const params = [videoId, fromSec];
    if (to != null && Number(to) >= fromSec) {
      sql += ' AND d.position_seconds <= ?';
      params.push(Number(to));
    }
    sql += ' ORDER BY d.position_seconds ASC, d.id ASC LIMIT ?';
    params.push(PAGE_SIZE_MAX);

    const rows = db.prepare(sql).all(...params);
    return {
      video_id: Number(videoId),
      list: rows.map(mapDanmakuRow),
    };
  }

  create(videoId, sessionId, rawContent, positionSeconds, color = '#ffffff') {
    const user = resolveUser(sessionId);
    const video = ensurePublishedVideo(videoId);

    assertRateLimit(`danmaku:video:${videoId}:user:${user.id}`, { limit: 5, windowMs: 60_000 });
    assertRateLimit(`danmaku:user:${user.id}`, { limit: 60, windowMs: 3_600_000 });

    const content = sanitizeCommentContent(rawContent, DANMAKU_MAX_LENGTH);
    if (!content) throw new Error('弹幕内容不能为空');
    if (content.length > DANMAKU_MAX_LENGTH) {
      throw new Error(`弹幕不能超过 ${DANMAKU_MAX_LENGTH} 字`);
    }

    let pos = Number(positionSeconds);
    if (!Number.isFinite(pos) || pos < 0) throw new Error('无效的播放时间点');
    const maxDuration = Math.max(Number(video.total_duration) || 0, 1);
    pos = Math.min(pos, maxDuration);

    const safeColor = /^#[0-9a-fA-F]{6}$/.test(String(color)) ? String(color) : '#ffffff';

    const result = db.prepare(`
      INSERT INTO video_danmaku (video_id, user_id, position_seconds, content, color, status)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(videoId, user.id, pos, content, safeColor);

    const row = db.prepare(`
      SELECT d.id, d.video_id, d.user_id, d.position_seconds, d.content, d.color, d.created_at,
        u.username
      FROM video_danmaku d
      INNER JOIN app_user u ON u.id = d.user_id
      WHERE d.id = ?
    `).get(result.lastInsertRowid);

    return mapDanmakuRow(row);
  }

  countByVideo(videoId) {
    ensurePublishedVideo(videoId);
    return db.prepare(`
      SELECT COUNT(*) AS c FROM video_danmaku WHERE video_id = ? AND status = 1
    `).get(videoId).c;
  }

  softDelete(id, sessionId, isAdmin = false) {
    const row = db.prepare('SELECT * FROM video_danmaku WHERE id = ?').get(id);
    if (!row || row.status !== 1) throw new Error('弹幕不存在');

    if (!isAdmin) {
      const user = resolveUser(sessionId);
      if (row.user_id !== user.id) throw new Error('无权删除该弹幕');
    }

    db.prepare(`
      UPDATE video_danmaku SET status = 0, updated_at = datetime('now') WHERE id = ?
    `).run(id);
    return true;
  }

  adminListByVideo(videoId, { page = 1, size = 50 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(size, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    const total = db.prepare(`
      SELECT COUNT(*) AS c FROM video_danmaku WHERE video_id = ? AND status = 1
    `).get(videoId).c;

    const rows = db.prepare(`
      SELECT d.id, d.video_id, d.user_id, d.position_seconds, d.content, d.color, d.created_at,
        u.username
      FROM video_danmaku d
      INNER JOIN app_user u ON u.id = d.user_id
      WHERE d.video_id = ? AND d.status = 1
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT ? OFFSET ?
    `).all(videoId, pageSize, offset);

    return {
      video_id: Number(videoId),
      total,
      page: pageNum,
      size: pageSize,
      list: rows.map(mapDanmakuRow),
    };
  }
}

module.exports = new DanmakuService();
