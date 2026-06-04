const highlightService = require('../../services/highlightService');
const { success, fail } = require('../../utils/response');

exports.list = (req, res) => {
  const videoId = req.query.video_id;
  if (!videoId) return res.status(400).json(fail(400, '缺少 video_id 参数'));
  const list = highlightService.listByVideoId(videoId);
  res.json(success({ list }));
};

exports.create = (req, res) => {
  try {
    const { video_id, timestamp, title, category, interaction_type, options } = req.body;
    if (!video_id || timestamp === undefined || !title || !category || !options) {
      return res.status(400).json(fail(400, '参数不完整'));
    }
    const data = highlightService.create({
      video_id,
      timestamp,
      title,
      category,
      interaction_type: interaction_type || category,
      options,
      source: 'manual',
      status: 'active',
    });
    res.json(success(data, '添加成功'));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.update = (req, res) => {
  const data = highlightService.update(req.params.id, req.body);
  if (!data) return res.status(404).json(fail(404, '高光点不存在'));
  res.json(success(data, '更新成功'));
};

exports.remove = (req, res) => {
  const ok = highlightService.delete(req.params.id);
  if (!ok) return res.status(404).json(fail(404, '高光点不存在'));
  res.json(success(null, '删除成功'));
};
