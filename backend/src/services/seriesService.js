const db = require('../db');
const { isPlaceholderCover } = require('../utils/defaultCover');
const { getBySessionId } = require('./userAuthService');

const SORT_MODES = new Set(['hot', 'recommend', 'latest']);

function resolveSeriesCoverUrl(series) {
  if (!series) return null;
  if (!isPlaceholderCover(series.cover_url)) {
    return series.cover_url;
  }

  const ep = db.prepare(`
    SELECT cover_url FROM video
    WHERE series_id = ? AND status = 1
      AND cover_url IS NOT NULL AND cover_url != ''
    ORDER BY episode_number ASC, id ASC
    LIMIT 1
  `).get(series.id);

  if (ep?.cover_url && !isPlaceholderCover(ep.cover_url)) {
    return ep.cover_url;
  }

  return series.cover_url;
}

class SeriesService {
  normalizeSort(sort) {
    const mode = String(sort || 'hot').toLowerCase();
    return SORT_MODES.has(mode) ? mode : 'hot';
  }

  resolveUserId(sessionId) {
    if (!sessionId || !String(sessionId).startsWith('user_')) return null;
    return getBySessionId(sessionId)?.id ?? null;
  }

  countPublished() {
    return db.prepare(`
      SELECT COUNT(DISTINCT s.id) as c
      FROM series s
      INNER JOIN video v ON v.series_id = s.id AND v.status = 1
    `).get().c;
  }

  decoratePublishedList(list) {
    list.forEach((item) => {
      item.cover_url = resolveSeriesCoverUrl(item);
    });
    return list;
  }

  listPublished(page = 1, size = 20, options = {}) {
    const sort = this.normalizeSort(options.sort);
    const userSessionId = options.userSessionId || null;
    const userId = this.resolveUserId(userSessionId);
    const offset = (page - 1) * size;
    const total = this.countPublished();

    let list;
    if (sort === 'latest') {
      list = this.listPublishedLatest(size, offset);
    } else if (sort === 'recommend') {
      list = this.listPublishedRecommend(size, offset, userSessionId, userId);
    } else {
      list = this.listPublishedHot(size, offset);
    }

    this.decoratePublishedList(list);
    return { total, page, size, sort, list };
  }

  listPublishedHot(size, offset) {
    return db.prepare(`
      SELECT s.id, s.title, s.cover_url,
        COUNT(v.id) as episode_count,
        MAX(v.updated_at) as latest_update,
        COALESCE((
          SELECT COUNT(*) FROM user_series_like WHERE series_id = s.id
        ), 0) AS like_count,
        COALESCE((
          SELECT COUNT(*) FROM user_series_favorite WHERE series_id = s.id
        ), 0) AS favorite_count,
        COALESCE((
          SELECT COUNT(DISTINCT wp.user_session_id)
          FROM watch_progress wp
          INNER JOIN video v2 ON v2.id = wp.video_id AND v2.series_id = s.id
          WHERE wp.position_seconds >= 5
        ), 0) AS watch_count
      FROM series s
      INNER JOIN video v ON v.series_id = s.id AND v.status = 1
      GROUP BY s.id
      ORDER BY (like_count * 2 + favorite_count * 3 + watch_count) DESC,
        latest_update DESC,
        s.id DESC
      LIMIT ? OFFSET ?
    `).all(size, offset);
  }

  listPublishedLatest(size, offset) {
    return db.prepare(`
      SELECT s.id, s.title, s.cover_url,
        COUNT(v.id) as episode_count,
        MAX(v.updated_at) as latest_update,
        COALESCE(MAX(v.created_at), s.created_at) as newest_at
      FROM series s
      INNER JOIN video v ON v.series_id = s.id AND v.status = 1
      GROUP BY s.id
      ORDER BY newest_at DESC, s.id DESC
      LIMIT ? OFFSET ?
    `).all(size, offset);
  }

  listPublishedRecommend(size, offset, userSessionId, userId) {
    const sessionKey = userSessionId ? String(userSessionId) : '';
    return db.prepare(`
      SELECT s.id, s.title, s.cover_url,
        COUNT(v.id) as episode_count,
        MAX(v.updated_at) as latest_update,
        COALESCE((
          SELECT COUNT(*) FROM user_series_like WHERE series_id = s.id
        ), 0) AS like_count,
        COALESCE((
          SELECT COUNT(*) FROM user_series_favorite WHERE series_id = s.id
        ), 0) AS favorite_count,
        COALESCE((
          SELECT COUNT(DISTINCT wp.user_session_id)
          FROM watch_progress wp
          INNER JOIN video v2 ON v2.id = wp.video_id AND v2.series_id = s.id
          WHERE wp.position_seconds >= 5
        ), 0) AS watch_count,
        up.max_position AS user_max_position,
        up.max_total_duration AS user_max_total_duration,
        CASE WHEN ? IS NOT NULL AND EXISTS (
          SELECT 1 FROM user_series_like usl
          WHERE usl.series_id = s.id AND usl.user_id = ?
        ) THEN 1 ELSE 0 END AS user_liked,
        CASE WHEN ? IS NOT NULL AND EXISTS (
          SELECT 1 FROM user_series_favorite usf
          WHERE usf.series_id = s.id AND usf.user_id = ?
        ) THEN 1 ELSE 0 END AS user_favorited
      FROM series s
      INNER JOIN video v ON v.series_id = s.id AND v.status = 1
      LEFT JOIN (
        SELECT v3.series_id,
          MAX(wp.position_seconds) AS max_position,
          MAX(v3.total_duration) AS max_total_duration
        FROM watch_progress wp
        INNER JOIN video v3 ON v3.id = wp.video_id
        WHERE wp.user_session_id = ?
        GROUP BY v3.series_id
      ) up ON up.series_id = s.id
      GROUP BY s.id
      ORDER BY (
        (like_count * 2 + favorite_count * 3 + watch_count)
        + CASE WHEN up.max_position IS NULL THEN 1000 ELSE 0 END
        + CASE
            WHEN up.max_position IS NOT NULL
              AND up.max_position >= 5
              AND up.max_position < MAX(up.max_total_duration * 0.92, up.max_total_duration - 8, 0)
            THEN 800
            ELSE 0
          END
        + CASE WHEN user_liked = 1 THEN 500 ELSE 0 END
        + CASE WHEN user_favorited = 1 THEN 700 ELSE 0 END
        - CASE
            WHEN up.max_position IS NOT NULL
              AND up.max_total_duration > 0
              AND up.max_position >= MAX(up.max_total_duration * 0.92, up.max_total_duration - 8, 0)
            THEN 600
            ELSE 0
          END
      ) DESC,
        latest_update DESC,
        s.id DESC
      LIMIT ? OFFSET ?
    `).all(
      userId,
      userId,
      userId,
      userId,
      sessionKey,
      size,
      offset,
    );
  }

  listAll() {
    return db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM video v WHERE v.series_id = s.id) as episode_count
      FROM series s
      ORDER BY s.updated_at DESC, s.title ASC
    `).all();
  }

  getById(id) {
    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(id);
    if (!series) return null;
    return { ...series, cover_url: resolveSeriesCoverUrl(series) };
  }

  findOrCreate(title, coverUrl = null) {
    const trimmed = (title || '').trim();
    if (!trimmed) throw new Error('剧名不能为空');

    const existing = db.prepare('SELECT * FROM series WHERE title = ?').get(trimmed);
    if (existing) {
      if (coverUrl && isPlaceholderCover(existing.cover_url)) {
        db.prepare('UPDATE series SET cover_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(coverUrl, existing.id);
      }
      return this.getById(existing.id);
    }

    const { DEFAULT_COVER_PATH } = require('../utils/defaultCover');
    const result = db.prepare(`
      INSERT INTO series (title, cover_url) VALUES (?, ?)
    `).run(trimmed, coverUrl || DEFAULT_COVER_PATH);

    return this.getById(result.lastInsertRowid);
  }

  syncSeriesCover(seriesId, preferredCoverUrl = null) {
    const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!series) return null;

    const coverUrl = preferredCoverUrl || db.prepare(`
      SELECT cover_url FROM video
      WHERE series_id = ?
      ORDER BY episode_number ASC, id ASC
      LIMIT 1
    `).get(seriesId)?.cover_url;

    if (!coverUrl || isPlaceholderCover(coverUrl)) {
      return this.getById(seriesId);
    }

    db.prepare('UPDATE series SET cover_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(coverUrl, seriesId);

    return this.getById(seriesId);
  }

  setCover(seriesId, coverUrl) {
    if (!coverUrl) throw new Error('封面地址不能为空');
    db.prepare('UPDATE series SET cover_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(coverUrl, seriesId);
    return this.getById(seriesId);
  }

  listPublishedEpisodes(seriesId) {
    const raw = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
    if (!raw) return null;

    const series = { ...raw, cover_url: resolveSeriesCoverUrl(raw) };

    const episodes = db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM highlight h WHERE h.video_id = v.id) as highlight_count
      FROM video v
      WHERE v.series_id = ? AND v.status = 1
      ORDER BY v.episode_number ASC, v.id ASC
    `).all(seriesId);

    return { series, episodes };
  }
}

module.exports = new SeriesService();
