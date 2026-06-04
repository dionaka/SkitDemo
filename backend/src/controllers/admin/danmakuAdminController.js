const danmakuService = require('../../services/danmakuService');
const danmakuHighlightService = require('../../services/danmakuHighlightService');
const { success, fail } = require('../../utils/response');

exports.listByVideo = (req, res) => {
  try {
    const data = danmakuService.adminListByVideo(req.params.id, req.query);
    res.json(success(data));
  } catch (e) {
    res.status(400).json(fail(400, e.message));
  }
};

exports.densityPreview = (req, res) => {
  try {
    const data = danmakuHighlightService.getDensityPreview(req.params.id);
    res.json(success(data));
  } catch (e) {
    res.status(400).json(fail(400, e.message));
  }
};

exports.analyzeHighlights = (req, res) => {
  danmakuHighlightService.analyzeVideoFromDanmaku(req.params.id)
    .then((data) => res.json(success(data, '弹幕高光分析完成')))
    .catch((e) => res.status(400).json(fail(400, e.message)));
};

exports.remove = (req, res) => {
  try {
    danmakuService.softDelete(req.params.id, null, true);
    res.json(success(null, '已删除'));
  } catch (e) {
    res.status(400).json(fail(400, e.message));
  }
};
