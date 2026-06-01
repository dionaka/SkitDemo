const seriesEngagementService = require('../../services/seriesEngagementService');
const { success, fail } = require('../../utils/response');

exports.getSeriesEngagement = (req, res) => {
  try {
    const data = seriesEngagementService.getEngagement(
      req.params.id,
      req.query.user_session_id
    );
    res.json(success(data));
  } catch (e) {
    res.status(404).json(fail(404, e.message || '获取失败'));
  }
};

exports.toggleLike = (req, res) => {
  try {
    const { user_session_id: sessionId } = req.body || {};
    const data = seriesEngagementService.toggleLike(req.params.id, sessionId);
    res.json(success(data));
  } catch (e) {
    const code = e.message.includes('登录') ? 401 : 400;
    res.status(code).json(fail(code, e.message || '操作失败'));
  }
};

exports.toggleFavorite = (req, res) => {
  try {
    const { user_session_id: sessionId } = req.body || {};
    const data = seriesEngagementService.toggleFavorite(req.params.id, sessionId);
    res.json(success(data));
  } catch (e) {
    const code = e.message.includes('登录') ? 401 : 400;
    res.status(code).json(fail(code, e.message || '操作失败'));
  }
};

exports.listFavorites = (req, res) => {
  try {
    const data = seriesEngagementService.listFavorites(req.query.user_session_id);
    res.json(success({ list: data }));
  } catch (e) {
    const code = e.message.includes('登录') ? 401 : 400;
    res.status(code).json(fail(code, e.message || '获取收藏失败'));
  }
};
