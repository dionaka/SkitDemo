const danmakuService = require('../../services/danmakuService');
const { success, fail } = require('../../utils/response');

exports.listByVideo = (req, res) => {
  try {
    const { from, to } = req.query;
    const data = danmakuService.listByVideo(req.params.id, { from, to });
    res.json(success(data));
  } catch (e) {
    const code = e.statusCode || 400;
    res.status(code).json(fail(code, e.message));
  }
};

exports.create = (req, res) => {
  try {
    const { content, position_seconds, user_session_id, color } = req.body || {};
    const data = danmakuService.create(
      req.params.id,
      user_session_id,
      content,
      position_seconds,
      color,
    );
    res.json(success(data, '弹幕已发送'));
  } catch (e) {
    const code = e.statusCode || 400;
    res.status(code).json(fail(code, e.message));
  }
};

exports.remove = (req, res) => {
  try {
    const sessionId = req.body?.user_session_id || req.query.user_session_id;
    danmakuService.softDelete(req.params.id, sessionId, false);
    res.json(success(null, '已删除'));
  } catch (e) {
    const code = e.statusCode || 400;
    res.status(code).json(fail(code, e.message));
  }
};
