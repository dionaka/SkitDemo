const videoService = require('../../services/videoService');
const { success, fail } = require('../../utils/response');

exports.list = (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const size = parseInt(req.query.size, 10) || 10;
  const data = videoService.listPublished(page, size);
  res.json(success(data));
};

exports.detail = async (req, res) => {
  const data = videoService.getDetailWithHighlights(req.params.id);
  if (!data) return res.status(404).json(fail(404, '视频不存在'));
  if (data.video.status !== 1) return res.status(404).json(fail(404, '视频未发布'));

  try {
    const stored = Number(data.video.total_duration) || 0;
    if (stored === 0 || stored === 300) {
      const synced = await videoService.syncDurationFromFile(req.params.id);
      if (synced) data.video.total_duration = synced.total_duration;
    }
  } catch { /* ignore probe errors */ }

  res.json(success(data));
};

exports.syncDuration = (req, res) => {
  const duration = Math.round(Number(req.body.duration_seconds) || 0);
  if (duration < 1 || duration > 86400) {
    return res.status(400).json(fail(400, '无效的视频时长'));
  }

  const video = videoService.getById(req.params.id);
  if (!video || video.status !== 1) {
    return res.status(404).json(fail(404, '视频不存在或未发布'));
  }

  const updated = videoService.updateDuration(video.id, duration, { clampProgress: true });
  res.json(success({
    video_id: updated.id,
    total_duration: updated.total_duration,
  }, '时长已同步'));
};
