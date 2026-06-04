const db = require('../db');
const { getBySessionId } = require('./userAuthService');
const { sanitizeCommentContent, COMMENT_MAX_LENGTH } = require('../utils/sanitizeText');
const { assertRateLimit } = require('../utils/rateLimit');

const PAGE_SIZE_MAX = 50;

function resolveUser(sessionId) {
  if (!sessionId || !String(sessionId).startsWith('user_')) {
    throw new Error('请先登录后再评论');
  }
  const user = getBySessionId(sessionId);
  if (!user) throw new Error('账号无效，请重新登录');
  return user;
}

function resolveUserOptional(sessionId) {
  if (!sessionId || !String(sessionId).startsWith('user_')) return null;
  return getBySessionId(sessionId);
}

function ensurePublishedVideo(videoId) {
  const id = Number(videoId);
  if (!Number.isInteger(id) || id < 1) throw new Error('无效的视频 ID');
  const video = db.prepare('SELECT id, status FROM video WHERE id = ?').get(id);
  if (!video || video.status !== 1) throw new Error('视频不存在或未发布');
  return video;
}

function mapCommentRow(row, viewerUserId = null) {
  return {
    id: row.id,
    video_id: row.video_id,
    content: row.content,
    created_at: row.created_at,
    user: {
      id: row.user_id,
      username: row.username,
      avatar_url: row.avatar_url || null,
    },
    can_delete: viewerUserId != null && viewerUserId === row.user_id,
  };
}

class CommentService {
  listByVideo(videoId, { page = 1, size = 20, sessionId } = {}) {
    ensurePublishedVideo(videoId);
    const viewer = resolveUserOptional(sessionId);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(size, 10) || 20));
    const offset = (pageNum - 1) * pageSize;

    const total = db.prepare(`
      SELECT COUNT(*) AS c FROM video_comment
      WHERE video_id = ? AND status = 1
    `).get(videoId).c;

    const rows = db.prepare(`
      SELECT c.id, c.video_id, c.user_id, c.content, c.created_at,
        u.username, u.avatar_url
      FROM video_comment c
      INNER JOIN app_user u ON u.id = c.user_id
      WHERE c.video_id = ? AND c.status = 1
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `).all(videoId, pageSize, offset);

    return {
      video_id: Number(videoId),
      total,
      page: pageNum,
      size: pageSize,
      list: rows.map((r) => mapCommentRow(r, viewer?.id)),
    };
  }

  create(videoId, sessionId, rawContent) {
    const user = resolveUser(sessionId);
    ensurePublishedVideo(videoId);

    assertRateLimit(`comment:user:${user.id}:video:${videoId}`, { limit: 3, windowMs: 60_000 });
    assertRateLimit(`comment:user:${user.id}:hour`, { limit: 30, windowMs: 3_600_000 });

    const content = sanitizeCommentContent(rawContent);
    if (!content) throw new Error(`评论内容不能为空（最多 ${COMMENT_MAX_LENGTH} 字）`);
    if (content.length < 2) throw new Error('评论至少 2 个字');

    const result = db.prepare(`
      INSERT INTO video_comment (video_id, user_id, content, status)
      VALUES (?, ?, ?, 1)
    `).run(videoId, user.id, content);

    const row = db.prepare(`
      SELECT c.id, c.video_id, c.user_id, c.content, c.created_at,
        u.username, u.avatar_url
      FROM video_comment c
      INNER JOIN app_user u ON u.id = c.user_id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    return mapCommentRow(row, user.id);
  }

  removeByUser(commentId, sessionId) {
    const user = resolveUser(sessionId);
    const id = Number(commentId);
    if (!Number.isInteger(id) || id < 1) throw new Error('无效的评论 ID');

    const row = db.prepare('SELECT * FROM video_comment WHERE id = ? AND status = 1').get(id);
    if (!row) throw new Error('评论不存在');
    if (row.user_id !== user.id) throw new Error('只能删除自己的评论');

    db.prepare(`
      UPDATE video_comment SET status = 0, updated_at = datetime('now') WHERE id = ?
    `).run(id);
    return { id, deleted: true };
  }

  adminListByVideo(videoId, { page = 1, size = 50 } = {}) {
    const id = Number(videoId);
    if (!Number.isInteger(id) || id < 1) throw new Error('无效的视频 ID');

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(size, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) AS c FROM video_comment WHERE video_id = ? AND status = 1')
      .get(id).c;

    const rows = db.prepare(`
      SELECT c.id, c.video_id, c.user_id, c.content, c.created_at,
        u.username, u.avatar_url
      FROM video_comment c
      INNER JOIN app_user u ON u.id = c.user_id
      WHERE c.video_id = ? AND c.status = 1
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `).all(id, pageSize, offset);

    return {
      video_id: id,
      total,
      page: pageNum,
      size: pageSize,
      list: rows.map((r) => mapCommentRow(r)),
    };
  }

  adminRemove(commentId) {
    const id = Number(commentId);
    if (!Number.isInteger(id) || id < 1) throw new Error('无效的评论 ID');
    const row = db.prepare('SELECT id FROM video_comment WHERE id = ? AND status = 1').get(id);
    if (!row) throw new Error('评论不存在');
    db.prepare(`
      UPDATE video_comment SET status = 0, updated_at = datetime('now') WHERE id = ?
    `).run(id);
    return { id, deleted: true };
  }

  countByVideo(videoId) {
    return db.prepare(`
      SELECT COUNT(*) AS c FROM video_comment WHERE video_id = ? AND status = 1
    `).get(videoId)?.c || 0;
  }
}

module.exports = new CommentService();
