const searchService = require('../../services/searchService');
const { success } = require('../../utils/response');

exports.search = (req, res) => {
  const q = req.query.q || req.query.keyword || '';
  const page = parseInt(req.query.page, 10) || 1;
  const size = Math.min(parseInt(req.query.size, 10) || 20, 50);
  const data = searchService.search(q, page, size);
  res.json(success(data));
};
