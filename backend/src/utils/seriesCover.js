const db = require('../db');
const { isPlaceholderCover } = require('./defaultCover');

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

function getSeriesCoverUrlById(seriesId) {
  const series = db.prepare('SELECT * FROM series WHERE id = ?').get(seriesId);
  return resolveSeriesCoverUrl(series);
}

module.exports = {
  resolveSeriesCoverUrl,
  getSeriesCoverUrlById,
};
