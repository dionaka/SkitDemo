const branchPointService = require('./branchPointService');
const { getCatalog } = require('./branchGenerationOptions');
const { success, fail } = require('../utils/response');

exports.generationOptions = (_req, res) => {
  res.json(success(getCatalog()));
};

exports.listByVideo = (req, res) => {
  const list = branchPointService.listByVideoId(req.params.videoId, false);
  res.json(success({ list }));
};

exports.analyze = async (req, res) => {
  try {
    const useVideoClip = req.body?.use_video_clip === true;
    const generationOptions = req.body?.generation_options || {};
    const data = await branchPointService.analyzeVideo(req.params.videoId, {
      useVideoClip,
      generationOptions,
    });
    res.json(success(data, `AI 已识别 ${data.branch_points.length} 个分支点，请审核后发布`));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

exports.create = (req, res) => {
  try {
    const { video_id, timestamp, title, choices, generation_options: generationOptions } = req.body;
    if (!video_id || timestamp == null || !title) {
      return res.status(400).json(fail(400, '缺少必要字段'));
    }
    const point = branchPointService.createPoint({
      video_id,
      timestamp,
      title,
      choices: choices || [],
      generationOptions: generationOptions || {},
    });
    res.json(success({ branch_point: point }));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.update = (req, res) => {
  const point = branchPointService.updatePoint(req.params.id, req.body);
  if (!point) return res.status(404).json(fail(404, '分支点不存在'));
  res.json(success({ branch_point: point }));
};

exports.remove = (req, res) => {
  if (!branchPointService.deletePoint(req.params.id)) {
    return res.status(404).json(fail(404, '分支点不存在'));
  }
  res.json(success(null, '已删除'));
};

exports.updateChoice = (req, res) => {
  const choice = branchPointService.updateChoice(req.params.choiceId, req.body);
  if (!choice) return res.status(404).json(fail(404, '选项不存在'));
  res.json(success({ choice }));
};

exports.uploadChoiceAssets = async (req, res) => {
  try {
    const choice = dbGetChoice(req.params.choiceId);
    if (!choice) return res.status(404).json(fail(404, '选项不存在'));

    const branchAssetService = require('./branchAssetService');
    const spec = JSON.parse(choice.asset_spec);

    if (req.files?.video_file?.[0]) {
      spec.generator = 'static';
      spec.type = 'video';
      spec.video_url = branchAssetService.saveUploadedFile(req.files.video_file[0]);
    }
    if (req.files?.image_file?.[0]) {
      spec.image_url = branchAssetService.saveUploadedFile(req.files.image_file[0]);
      if (!spec.type) spec.type = 'composite';
    }
    if (req.files?.audio_file?.[0]) {
      spec.audio_url = branchAssetService.saveUploadedFile(req.files.audio_file[0]);
      spec.provider = 'file';
    }

    branchPointService.updateChoice(req.params.choiceId, { asset_spec: spec });
    res.json(success(null, '上传成功'));
  } catch (err) {
    res.status(400).json(fail(400, err.message));
  }
};

exports.prewarmVideo = async (req, res) => {
  try {
    const list = branchPointService.listByVideoId(req.params.videoId, false);
    const { resolveAsset } = require('./generators');
    for (const p of list) {
      for (const c of p.choices) {
        try {
          await resolveAsset(c.asset_spec);
        } catch (err) {
          console.warn(`[branch] 预热 choice #${c.id} 失败:`, err.message);
        }
      }
    }
    res.json(success(null, '预热完成'));
  } catch (err) {
    res.status(500).json(fail(500, err.message));
  }
};

function dbGetChoice(id) {
  const db = require('../db');
  return db.prepare('SELECT * FROM video_branch_choice WHERE id = ?').get(id);
}
