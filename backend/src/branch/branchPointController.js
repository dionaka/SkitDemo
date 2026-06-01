const branchPointService = require('./branchPointService');
const { success, fail } = require('../utils/response');

exports.listByVideo = (req, res) => {
  const videoId = req.params.videoId;
  const list = branchPointService.listByVideoId(videoId, true);
  res.json(success({
    list: list.map((p) => ({
      id: p.id,
      video_id: p.video_id,
      timestamp: p.timestamp,
      title: p.title,
      choice_count: p.choices.length,
    })),
  }));
};

exports.getDetail = async (req, res) => {
  try {
    const data = await branchPointService.getDetailResolved(req.params.id);
    if (!data || data.status !== 1) {
      return res.status(404).json(fail(404, '分支点不存在'));
    }
    res.json(success({ branch_point: data }));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.choose = async (req, res) => {
  try {
    const { choice_id, user_session_id } = req.body;
    if (!choice_id || !user_session_id) {
      return res.status(400).json(fail(400, '缺少必要参数'));
    }
    const data = await branchPointService.choose({
      branchPointId: req.params.id,
      choiceId: choice_id,
      userSessionId: user_session_id,
    });
    res.json(success(data));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.stats = (req, res) => {
  const data = branchPointService.getPointStats(req.params.id);
  res.json(success(data));
};
