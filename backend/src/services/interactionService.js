const db = require('../db');

class InteractionService {
  record({ highlight_id, user_session_id, selected_option }) {
    const highlight = db.prepare('SELECT * FROM highlight WHERE id = ?').get(highlight_id);
    if (!highlight) throw new Error('高光点不存在');

    const options = JSON.parse(highlight.options);
    if (!options.includes(selected_option)) {
      throw new Error('无效的互动选项');
    }

    const result = db.prepare(`
      INSERT INTO user_interaction (highlight_id, user_session_id, selected_option)
      VALUES (?, ?, ?)
    `).run(highlight_id, user_session_id, selected_option);

    return { interaction_id: result.lastInsertRowid };
  }

  getStats(highlightId) {
    const highlight = db.prepare('SELECT * FROM highlight WHERE id = ?').get(highlightId);
    if (!highlight) return null;

    const options = JSON.parse(highlight.options);
    const rows = db.prepare(`
      SELECT selected_option, COUNT(*) as count
      FROM user_interaction WHERE highlight_id = ?
      GROUP BY selected_option
    `).all(highlightId);

    const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
    const countMap = Object.fromEntries(rows.map((r) => [r.selected_option, r.count]));

    const stats = options.map((option) => {
      const count = countMap[option] || 0;
      return {
        option,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0,
      };
    });

    return { highlight_id: Number(highlightId), total_count: totalCount, options: stats };
  }
}

module.exports = new InteractionService();
