const videoService = require('../../services/videoService');
const { success, fail } = require('../../utils/response');

exports.list = (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const size = parseInt(req.query.size, 10) || 10;
  const data = videoService.listPublished(page, size);
  res.json(success(data));
};

exports.detail = (req, res) => {
  const data = videoService.getDetailWithHighlights(req.params.id);
  if (!data) return res.status(404).json(fail(404, '视频不存在'));
  if (data.video.status !== 1) return res.status(404).json(fail(404, '视频未发布'));
  res.json(success(data));
};
