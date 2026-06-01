const db = require('../db');
const { isPlaceholderCover } = require('../utils/defaultCover');

function resolveSeriesCoverUrl(series) {
  if (!series) return null;
  if (!isPlaceholderCover(series.cover_url)) return series.cover_url;

  const ep = db.prepare(`
    SELECT cover_url FROM video
    WHERE series_id = ? AND status = 1
      AND cover_url IS NOT NULL AND cover_url != ''
    ORDER BY episode_number ASC, id ASC
    LIMIT 1
  `).get(series.id);

  if (ep?.cover_url && !isPlaceholderCover(ep.cover_url)) return ep.cover_url;
  return series.cover_url;
}

class SearchService {
  search(keyword, page = 1, size = 20) {
    const q = String(keyword || '').trim();
    if (!q) return { total: 0, page, size, list: [] };

    const pattern = `%${q}%`;
    const offset = (page - 1) * size;

    const seriesRows = db.prepare(`
      SELECT DISTINCT s.id, s.title, s.cover_url,
        (SELECT COUNT(*) FROM video v WHERE v.series_id = s.id AND v.status = 1) as episode_count
      FROM series s
      INNER JOIN video v ON v.series_id = s.id AND v.status = 1
      WHERE s.title LIKE ?
         OR v.title LIKE ?
      ORDER BY s.title ASC
    `).all(pattern, pattern);

    const episodeRows = db.prepare(`
      SELECT v.id, v.title, v.cover_url, v.episode_number, v.series_id,
        s.title AS series_title
      FROM video v
      INNER JOIN series s ON s.id = v.series_id
      WHERE v.status = 1
        AND (v.title LIKE ? OR s.title LIKE ?)
      ORDER BY s.title ASC, v.episode_number ASC
    `).all(pattern, pattern);

    const seriesItems = seriesRows.map((row) => ({
      type: 'series',
      id: row.id,
      title: row.title,
      cover_url: resolveSeriesCoverUrl(row),
      episode_count: row.episode_count,
    }));

    const episodeItems = episodeRows.map((row) => ({
      type: 'episode',
      id: row.id,
      title: row.title,
      cover_url: row.cover_url,
      episode_number: row.episode_number,
      series_id: row.series_id,
      series_title: row.series_title,
    }));

    const merged = [...seriesItems, ...episodeItems];
    const total = merged.length;
    const list = merged.slice(offset, offset + size);

    return { total, page, size, list, keyword: q };
  }
}

module.exports = new SearchService();
