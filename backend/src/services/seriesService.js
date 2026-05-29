const db = require('../db');
const { DEFAULT_COVER_PATH } = require('../utils/defaultCover');

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

    return { total, page, size, list };
  }

  getById(id) {
    return db.prepare('SELECT * FROM series WHERE id = ?').get(id);
  }

  findOrCreate(title, coverUrl = null) {
    const trimmed = (title || '').trim();
    if (!trimmed) throw new Error('剧名不能为空');

    const existing = db.prepare('SELECT * FROM series WHERE title = ?').get(trimmed);
    if (existing) {
      if (coverUrl && !existing.cover_url) {
        db.prepare('UPDATE series SET cover_url = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(coverUrl, existing.id);
      }
      return this.getById(existing.id);
    }

    const result = db.prepare(`
      INSERT INTO series (title, cover_url) VALUES (?, ?)
    `).run(trimmed, coverUrl || DEFAULT_COVER_PATH);

    return this.getById(result.lastInsertRowid);
  }

  listPublishedEpisodes(seriesId) {
    const series = this.getById(seriesId);
    if (!series) return null;

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
