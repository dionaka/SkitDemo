const commentService = require('../../services/commentService');
const { success, fail } = require('../../utils/response');

exports.listByVideo = (req, res) => {
  try {
    const data = commentService.adminListByVideo(req.params.id, {
      page: req.query.page,
      size: req.query.size,
    });
    res.json(success(data));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.remove = (req, res) => {
  try {
    const data = commentService.adminRemove(req.params.id);
    res.json(success(data, '评论已删除'));
  } catch (err) {
    res.status(404).json(fail(404, err.message));
  }
};
