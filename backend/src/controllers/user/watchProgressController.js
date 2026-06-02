const watchProgressService = require('../../services/watchProgressService');
const videoService = require('../../services/videoService');
const { success, fail } = require('../../utils/response');

exports.save = (req, res) => {
  const { user_session_id, position_seconds, bump_time } = req.body;
  const videoId = req.params.videoId;

  if (!user_session_id) {
    return res.status(400).json(fail(400, '缺少 user_session_id'));
  }
  if (position_seconds === undefined || position_seconds === null) {
    return res.status(400).json(fail(400, '缺少 position_seconds'));
  }

  const video = videoService.getById(videoId);
  if (!video) {
    return res.status(404).json(fail(404, '视频不存在'));
  }

  const data = watchProgressService.save(user_session_id, videoId, position_seconds, {
    bumpTime: Boolean(bump_time),
  });
  res.json(success(data, '进度已保存'));
};

exports.getOne = (req, res) => {
  const sessionId = req.query.user_session_id;
  if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));

  const progress = watchProgressService.get(sessionId, req.params.videoId);
  res.json(success({
    video_id: Number(req.params.videoId),
    position_seconds: progress?.position_seconds || 0,
  }));
};

exports.continueList = (req, res) => {
  const sessionId = req.query.user_session_id;
  if (!sessionId) return res.status(400).json(fail(400, '缺少 user_session_id'));

  const list = watchProgressService.getContinueList(sessionId);
  res.json(success({ list }));
};
