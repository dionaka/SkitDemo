const seriesService = require('../../services/seriesService');
const watchProgressService = require('../../services/watchProgressService');
const { success, fail } = require('../../utils/response');

exports.list = (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const size = parseInt(req.query.size, 10) || 20;
  const data = seriesService.listPublished(page, size);
  res.json(success(data));
};

exports.episodes = (req, res) => {
  const data = seriesService.listPublishedEpisodes(req.params.id);
  if (!data) return res.status(404).json(fail(404, '短剧不存在或未发布'));
  res.json(success(data));
};

exports.episodesWithProgress = (req, res) => {
  const data = seriesService.listPublishedEpisodes(req.params.id);
  if (!data) return res.status(404).json(fail(404, '短剧不存在或未发布'));

  const sessionId = req.query.user_session_id;
  let progressMap = {};
  if (sessionId) {
    const videoIds = data.episodes.map((e) => e.id);
    const all = watchProgressService.getMapBySession(sessionId);
    videoIds.forEach((id) => {
      if (all[id] != null) progressMap[id] = all[id];
    });
  }

  res.json(success({ ...data, progress_map: progressMap }));
};
