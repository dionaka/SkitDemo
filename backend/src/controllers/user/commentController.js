const commentService = require('../../services/commentService');
const { success, fail } = require('../../utils/response');

function mapErrorStatus(err) {
  if (err.statusCode === 429) return 429;
  const msg = err.message || '';
  if (msg.includes('登录')) return 401;
  if (msg.includes('不存在') || msg.includes('未发布')) return 404;
  return 400;
}

exports.listByVideo = (req, res) => {
  try {
    const data = commentService.listByVideo(req.params.id, {
      page: req.query.page,
      size: req.query.size,
      sessionId: req.query.user_session_id,
    });
    res.json(success(data));
  } catch (err) {
    res.status(mapErrorStatus(err)).json(fail(mapErrorStatus(err), err.message));
  }
};

exports.create = (req, res) => {
  try {
    const { user_session_id: sessionId, content } = req.body || {};
    const comment = commentService.create(req.params.id, sessionId, content);
    res.json(success(comment, '评论成功'));
  } catch (err) {
    res.status(mapErrorStatus(err)).json(fail(mapErrorStatus(err), err.message));
  }
};

exports.remove = (req, res) => {
  try {
    const { user_session_id: sessionId } = req.body || {};
    const data = commentService.removeByUser(req.params.id, sessionId);
    res.json(success(data, '已删除'));
  } catch (err) {
    res.status(mapErrorStatus(err)).json(fail(mapErrorStatus(err), err.message));
  }
};
