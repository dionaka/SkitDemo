const coverService = require('../../services/coverService');
const videoService = require('../../services/videoService');
const highlightService = require('../../services/highlightService');
const seriesService = require('../../services/seriesService');
const { success, fail } = require('../../utils/response');

exports.upload = async (req, res) => {
  try {
    const videoFile = req.files?.video_file?.[0] || req.file;
    if (!videoFile) return res.status(400).json(fail(400, '请上传视频文件'));

    const coverFile = req.files?.cover_file?.[0] || null;
    const { title, series_title } = req.body;
    if (!title) return res.status(400).json(fail(400, '请填写单集标题'));

    const episodeNumber = parseInt(req.body.episode_number, 10) || 1;
    const seriesName = (series_title || title).trim();
    if (!seriesName) return res.status(400).json(fail(400, '请填写剧名'));

    const videoUrl = videoService.saveUploadedFile(videoFile, 'videos');
    const coverUrl = await coverService.resolveCoverForUpload({ videoUrl, coverFile });
    const series = seriesService.findOrCreate(seriesName);

    const video = videoService.create({
      title,
      coverUrl,
      videoUrl,
      totalDuration: parseInt(req.body.total_duration, 10) || 300,
      seriesId: series.id,
      episodeNumber,
    });

    if (episodeNumber === 1 || coverService.isPlaceholderCover(series.cover_url)) {
      seriesService.syncSeriesCover(series.id, coverUrl);
    }

    const updatedSeries = seriesService.getById(series.id);

    res.json(success({
      video_id: video.id,
      title: video.title,
      series_id: updatedSeries.id,
      series_title: updatedSeries.title,
      episode_number: video.episode_number,
      cover_url: video.cover_url,
      video_url: video.video_url,
      total_duration: video.total_duration,
      status: video.status,
    }, coverFile ? '上传成功' : '上传成功，已从视频截取封面'));
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
  if (video.series_id) {
    seriesService.syncSeriesCover(video.series_id);
  }
  res.json(success({ video_id: video.id, status: video.status }, '发布成功'));
};

exports.update = (req, res) => {
  try {
    const { title, series_title, episode_number, total_duration } = req.body;
    const seriesName = (series_title || '').trim();
    if (!seriesName) return res.status(400).json(fail(400, '请填写剧名'));
    if (!title?.trim()) return res.status(400).json(fail(400, '请填写单集标题'));

    const series = seriesService.findOrCreate(seriesName);
    const video = videoService.update(req.params.id, {
      title: title.trim(),
      seriesId: series.id,
      episodeNumber: parseInt(episode_number, 10) || 1,
      totalDuration: parseInt(total_duration, 10) || 0,
    });
    if (!video) return res.status(404).json(fail(404, '视频不存在'));

    seriesService.syncSeriesCover(series.id);

    res.json(success({
      video_id: video.id,
      title: video.title,
      series_id: series.id,
      series_title: series.title,
      episode_number: video.episode_number,
      total_duration: video.total_duration,
      cover_url: video.cover_url,
    }, '保存成功'));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.updateCover = (req, res) => {
  try {
    if (!req.file) return res.status(400).json(fail(400, '请上传封面图片'));

    const video = videoService.getById(req.params.id);
    if (!video) return res.status(404).json(fail(404, '视频不存在'));

    const coverUrl = coverService.saveCoverImageFile(req.file);
    const updated = videoService.updateCover(video.id, coverUrl);

    if (req.body.sync_series === '1' || String(req.body.sync_series) === 'true') {
      seriesService.setCover(video.series_id, coverUrl);
    } else if (video.episode_number === 1) {
      seriesService.syncSeriesCover(video.series_id, coverUrl);
    }

    res.json(success({
      video_id: updated.id,
      cover_url: updated.cover_url,
    }, '封面已更新'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.regenerateCover = async (req, res) => {
  try {
    const video = videoService.getById(req.params.id);
    if (!video) return res.status(404).json(fail(404, '视频不存在'));

    const coverUrl = await coverService.regenerateVideoCover(video);
    const updated = videoService.updateCover(video.id, coverUrl);

    if (req.body.sync_series === '1' || String(req.body.sync_series) === 'true' || video.episode_number === 1) {
      seriesService.syncSeriesCover(video.series_id, coverUrl);
    }

    res.json(success({
      video_id: updated.id,
      cover_url: updated.cover_url,
    }, coverService.isPlaceholderCover(coverUrl) ? '截帧失败，请安装 ffmpeg 或手动上传封面' : '已从视频重新截取封面'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.remove = (req, res) => {
  const ok = videoService.remove(req.params.id);
  if (!ok) return res.status(404).json(fail(404, '视频不存在'));
  res.json(success(null, '删除成功'));
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
