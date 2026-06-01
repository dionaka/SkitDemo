const db = require('../db');
const seriesService = require('./seriesService');
const { getBySessionId } = require('./userAuthService');

function resolveUser(sessionId) {
  if (!sessionId || !String(sessionId).startsWith('user_')) {
    throw new Error('请先登录后再操作');
  }
  const user = getBySessionId(sessionId);
  if (!user) throw new Error('账号无效，请重新登录');
  return user;
}

function resolveUserOptional(sessionId) {
  if (!sessionId || !String(sessionId).startsWith('user_')) return null;
  return getBySessionId(sessionId);
}

function ensureSeries(seriesId) {
  const series = seriesService.getById(seriesId);
  if (!series) throw new Error('短剧不存在');
  return series;
}

class SeriesEngagementService {
  getEngagement(seriesId, sessionId) {
    ensureSeries(seriesId);
    const user = resolveUserOptional(sessionId);

    const likeCount = db.prepare(
      'SELECT COUNT(*) AS c FROM user_series_like WHERE series_id = ?'
    ).get(seriesId).c;

    const favoriteCount = db.prepare(
      'SELECT COUNT(*) AS c FROM user_series_favorite WHERE series_id = ?'
    ).get(seriesId).c;

    let liked = false;
    let favorited = false;
    if (user) {
      liked = Boolean(db.prepare(
        'SELECT 1 FROM user_series_like WHERE user_id = ? AND series_id = ?'
      ).get(user.id, seriesId));
      favorited = Boolean(db.prepare(
        'SELECT 1 FROM user_series_favorite WHERE user_id = ? AND series_id = ?'
      ).get(user.id, seriesId));
    }

    return {
      series_id: Number(seriesId),
      like_count: likeCount,
      favorite_count: favoriteCount,
      liked,
      favorited,
    };
  }

  toggleLike(seriesId, sessionId) {
    const user = resolveUser(sessionId);
    ensureSeries(seriesId);

    const existing = db.prepare(
      'SELECT 1 FROM user_series_like WHERE user_id = ? AND series_id = ?'
    ).get(user.id, seriesId);

    if (existing) {
      db.prepare('DELETE FROM user_series_like WHERE user_id = ? AND series_id = ?')
        .run(user.id, seriesId);
    } else {
      db.prepare(`
        INSERT INTO user_series_like (user_id, series_id)
        VALUES (?, ?)
      `).run(user.id, seriesId);
    }

    return this.getEngagement(seriesId, sessionId);
  }

  toggleFavorite(seriesId, sessionId) {
    const user = resolveUser(sessionId);
    ensureSeries(seriesId);

    const existing = db.prepare(
      'SELECT 1 FROM user_series_favorite WHERE user_id = ? AND series_id = ?'
    ).get(user.id, seriesId);

    if (existing) {
      db.prepare('DELETE FROM user_series_favorite WHERE user_id = ? AND series_id = ?')
        .run(user.id, seriesId);
    } else {
      db.prepare(`
        INSERT INTO user_series_favorite (user_id, series_id)
        VALUES (?, ?)
      `).run(user.id, seriesId);
    }

    return this.getEngagement(seriesId, sessionId);
  }

  listFavorites(sessionId) {
    const user = resolveUser(sessionId);
    const rows = db.prepare(`
      SELECT s.id, s.title, s.cover_url,
        (SELECT COUNT(*) FROM video v WHERE v.series_id = s.id AND v.status = 1) AS episode_count,
        f.created_at AS favorited_at
      FROM user_series_favorite f
      INNER JOIN series s ON s.id = f.series_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(user.id);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      cover_url: seriesService.getById(row.id)?.cover_url || row.cover_url,
      episode_count: row.episode_count,
      favorited_at: row.favorited_at,
    }));
  }
}

module.exports = new SeriesEngagementService();
