const videoService = require('../../services/videoService');
const highlightService = require('../../services/highlightService');
const { success, fail } = require('../../utils/response');

exports.upload = (req, res) => {
  try {
    if (!req.file) return res.status(400).json(fail(400, '请上传视频文件'));
    const { title } = req.body;
    if (!title) return res.status(400).json(fail(400, '请填写视频标题'));

    const videoUrl = videoService.saveUploadedFile(req.file, 'videos');
    const coverUrl = '/uploads/covers/default-cover.jpg';

    const video = videoService.create({
      title,
      coverUrl,
      videoUrl,
      totalDuration: parseInt(req.body.total_duration, 10) || 300,
    });

    res.json(success({
      video_id: video.id,
      title: video.title,
      cover_url: video.cover_url,
      video_url: video.video_url,
      total_duration: video.total_duration,
      status: video.status,
    }, '上传成功'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.list = (_req, res) => {
  const list = videoService.listAll();
  res.json(success({ list }));
};

exports.publish = (req, res) => {
  const video = videoService.publish(req.params.id);
  if (!video) return res.status(404).json(fail(404, '视频不存在'));
  res.json(success({ video_id: video.id, status: video.status }, '发布成功'));
};

exports.analyze = async (req, res) => {
  try {
    const { highlights: saved, source, reason } = await highlightService.analyzeVideo(req.params.id);
    const message = source === 'doubao'
      ? 'AI 真实分析完成'
      : `⚠️ 使用了模拟数据（${reason || '未知原因'}），请重启后端并检查 .env 配置`;
    res.json(success({
      video_id: Number(req.params.id),
      analyzed_count: saved.length,
      highlights: saved,
      analyze_source: source,
      analyze_message: message,
    }, message));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};
