const db = require('../db');
const { isPlaceholderCover } = require('../utils/defaultCover');

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
  listAll() {
    return db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM video v WHERE v.series_id = s.id) as episode_count
      FROM series s
      ORDER BY s.updated_at DESC, s.title ASC
    `).all();
  }

  listPublished(page = 1, size = 20) {
    const offset = (page - 1) * size;
    const total = db.prepare(`
      SELECT COUNT(DISTINCT s.id) as c
      FROM series s
      INNER JOIN video v ON v.series_id = s.id AND v.status = 1
    `).get().c;

    const list = db.prepare(`
      SELECT s.id, s.title, s.cover_url,
        COUNT(v.id) as episode_count,
        MAX(v.updated_at) as latest_update
      FROM series s
      INNER JOIN video v ON v.series_id = s.id AND v.status = 1
      GROUP BY s.id
      ORDER BY latest_update DESC
      LIMIT ? OFFSET ?
    `).all(size, offset);

    list.forEach((item) => {
      item.cover_url = resolveSeriesCoverUrl(item);
    });

    return { total, page, size, list };
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
