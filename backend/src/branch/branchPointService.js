const db = require('../db');
const path = require('path');
const config = require('../config');
const videoService = require('../services/videoService');
const aiModelService = require('../services/aiModelService');
const { resolveAsset } = require('./generators');
const { GENERATOR_IDS, ASSET_TYPES } = require('./generators/types');
const {
  normalizeGenerationOptions,
  resolveVoice,
  DEFAULT_FALLBACK_IMAGE,
} = require('./branchGenerationOptions');

function buildAssetSpec(narration, optionLabel, generationOptions = {}, videoMeta = null) {
  const opts = normalizeGenerationOptions(generationOptions);
  const text = narration || optionLabel;
  const voice = resolveVoice(opts);
  const imageContext = {
    image_api: opts.image_api,
    drama_genre: opts.drama_genre,
    series_title: videoMeta?.seriesTitle || '',
    video_title: videoMeta?.videoTitle || '',
    branch_title: videoMeta?.branchTitle || '',
    option_label: optionLabel,
    option_desc: videoMeta?.optionDesc || '',
    narration: text,
    image_prompt: videoMeta?.imagePrompt || '',
    source_video_url: videoMeta?.videoUrl || '',
    reference_timestamp: videoMeta?.timestamp ?? videoMeta?.referenceTimestamp ?? 0,
    image_url: opts.image_api === 'manual' ? opts.manual_image_url : undefined,
  };

  if (opts.visual_generator === 'video_synth' && videoMeta?.videoUrl) {
    const start = Math.max(0, (videoMeta.timestamp || 0) - 2);
    const end = (videoMeta.timestamp || 0) + 8;
    return {
      generator: GENERATOR_IDS.VIDEO_SYNTH,
      type: ASSET_TYPES.VIDEO,
      source_video_url: videoMeta.videoUrl,
      start_at: start,
      end_at: end,
      fallback_image_url: opts.fallback_image_url || DEFAULT_FALLBACK_IMAGE,
      caption: text,
      duration: end - start,
      tts_provider: opts.tts_provider,
      tts_voice: voice,
      generation_options: opts,
      ...imageContext,
    };
  }

  if (opts.visual_generator === 'static') {
    return {
      generator: GENERATOR_IDS.STATIC,
      type: ASSET_TYPES.COMPOSITE,
      text,
      caption: text,
      image_url: opts.image_api === 'manual' && opts.manual_image_url
        ? opts.manual_image_url
        : opts.fallback_image_url || DEFAULT_FALLBACK_IMAGE,
      provider: opts.tts_provider,
      voice,
      duration: 6,
      generation_options: opts,
      ...imageContext,
    };
  }

  return {
    generator: GENERATOR_IDS.TTS,
    type: ASSET_TYPES.COMPOSITE,
    text,
    caption: text,
    provider: opts.tts_provider,
    voice,
    duration: 6,
    generation_options: opts,
    ...imageContext,
  };
}

/** @deprecated 使用 buildAssetSpec */
function buildTtsAssetSpec(narration, optionLabel, generationOptions) {
  return buildAssetSpec(narration, optionLabel, generationOptions);
}

/** @deprecated 使用 buildAssetSpec */
function buildVideoSynthSpec(videoUrl, timestamp, narration, generationOptions) {
  return buildAssetSpec(narration, narration, {
    ...generationOptions,
    visual_generator: 'video_synth',
  }, { videoUrl, timestamp });
}

class BranchPointService {
  listByVideoId(videoId, publishedOnly = false) {
    const rows = db.prepare(`
      SELECT * FROM video_branch_point
      WHERE video_id = ?
      ${publishedOnly ? 'AND status = 1' : ''}
      ORDER BY timestamp ASC
    `).all(videoId);

    return rows.map((row) => this._attachChoices(row));
  }

  _attachChoices(pointRow) {
    const choices = db.prepare(`
      SELECT * FROM video_branch_choice
      WHERE branch_point_id = ?
      ORDER BY sort_order ASC, id ASC
    `).all(pointRow.id);

    return {
      ...pointRow,
      choices: choices.map((c) => ({
        ...c,
        asset_spec: JSON.parse(c.asset_spec),
      })),
    };
  }

  getById(id) {
    const row = db.prepare('SELECT * FROM video_branch_point WHERE id = ?').get(id);
    return row ? this._attachChoices(row) : null;
  }

  async getDetailResolved(id) {
    const point = this.getById(id);
    if (!point) return null;

    const choices = await Promise.all(point.choices.map(async (c) => {
      let preview = null;
      try {
        preview = await resolveAsset(c.asset_spec);
      } catch { /* ignore */ }
      return {
        id: c.id,
        option_label: c.option_label,
        option_desc: c.option_desc,
        preview,
      };
    }));

    return {
      ...point,
      choices,
    };
  }

  createPoint({ video_id, timestamp, title, status = 1, choices = [], generationOptions = {} }) {
    const video = videoService.getById(video_id);
    const videoMeta = video ? {
      seriesTitle: video.series_title || '',
      videoTitle: video.title || '',
      branchTitle: title,
      videoUrl: video.video_url,
      timestamp,
      referenceTimestamp: timestamp,
    } : {};

    const result = db.prepare(`
      INSERT INTO video_branch_point (video_id, timestamp, title, status)
      VALUES (?, ?, ?, ?)
    `).run(video_id, timestamp, title, status);

    const pointId = result.lastInsertRowid;
    choices.forEach((c, i) => this._insertChoice(pointId, c, i, generationOptions, {
      ...videoMeta,
      branchTitle: title,
      optionDesc: c.option_desc,
      timestamp,
    }));
    return this.getById(pointId);
  }

  _insertChoice(pointId, choice, sortOrder, generationOptions = {}, videoMeta = {}) {
    const assetSpec = choice.asset_spec
      ? (typeof choice.asset_spec === 'string' ? choice.asset_spec : JSON.stringify(choice.asset_spec))
      : JSON.stringify(buildAssetSpec(
        choice.narration,
        choice.option_label,
        generationOptions,
        {
          ...videoMeta,
          optionDesc: choice.option_desc,
          imagePrompt: choice.image_prompt || '',
        },
      ));

    db.prepare(`
      INSERT INTO video_branch_choice (branch_point_id, option_label, option_desc, asset_spec, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      pointId,
      choice.option_label,
      choice.option_desc || '',
      assetSpec,
      sortOrder,
    );
  }

  updatePoint(id, data) {
    const existing = this.getById(id);
    if (!existing) return null;

    db.prepare(`
      UPDATE video_branch_point SET
        timestamp = COALESCE(?, timestamp),
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.timestamp ?? null,
      data.title ?? null,
      data.status ?? null,
      id,
    );

    return this.getById(id);
  }

  updateChoice(choiceId, data) {
    const row = db.prepare('SELECT * FROM video_branch_choice WHERE id = ?').get(choiceId);
    if (!row) return null;

    const spec = data.asset_spec
      ? (typeof data.asset_spec === 'string' ? data.asset_spec : JSON.stringify(data.asset_spec))
      : row.asset_spec;

    db.prepare(`
      UPDATE video_branch_choice SET
        option_label = COALESCE(?, option_label),
        option_desc = COALESCE(?, option_desc),
        asset_spec = ?
      WHERE id = ?
    `).run(
      data.option_label ?? null,
      data.option_desc ?? null,
      spec,
      choiceId,
    );

    return db.prepare('SELECT * FROM video_branch_choice WHERE id = ?').get(choiceId);
  }

  deletePoint(id) {
    const result = db.prepare('DELETE FROM video_branch_point WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteChoice(choiceId) {
    const result = db.prepare('DELETE FROM video_branch_choice WHERE id = ?').run(choiceId);
    return result.changes > 0;
  }

  async analyzeVideo(videoId, { useVideoClip = false, generationOptions = {} } = {}) {
    const video = videoService.getById(videoId);
    if (!video) throw new Error('视频不存在');

    const opts = normalizeGenerationOptions({
      ...generationOptions,
      visual_generator: generationOptions.visual_generator
        || (useVideoClip ? 'video_synth' : 'tts'),
    });

    if (opts.narration_api === 'manual') {
      throw new Error('旁白来源为「手动填写」时，请使用手动添加分支点，勿调用 AI 识别');
    }

    const videoPath = path.join(
      config.uploadBasePath,
      video.video_url.replace('/uploads/', ''),
    );

    const result = await aiModelService.analyzeBranches(videoPath, video.total_duration);
    const { branch_points: points, source, reason } = result;

    db.prepare('DELETE FROM video_branch_point WHERE video_id = ?').run(videoId);

    const saved = points.map((p) => this.createPoint({
      video_id: videoId,
      timestamp: p.timestamp,
      title: p.title,
      status: 1,
      generationOptions: opts,
      choices: p.choices.map((c, i) => ({
        option_label: c.option_label,
        option_desc: c.option_desc,
        asset_spec: buildAssetSpec(
          c.narration,
          c.option_label,
          opts,
          {
            videoUrl: video.video_url,
            timestamp: p.timestamp,
            seriesTitle: video.series_title || '',
            videoTitle: video.title || '',
            branchTitle: p.title,
            optionDesc: c.option_desc,
            imagePrompt: c.image_prompt || '',
          },
        ),
      })),
    }));

    return { branch_points: saved, source, reason };
  }

  async choose({ branchPointId, choiceId, userSessionId }) {
    const point = this.getById(branchPointId);
    if (!point || point.status !== 1) throw new Error('分支点不存在或未发布');

    const choice = point.choices.find((c) => c.id === choiceId);
    if (!choice) throw new Error('无效的分支选项');

    db.prepare(`
      INSERT INTO video_branch_user_pick (branch_point_id, choice_id, user_session_id)
      VALUES (?, ?, ?)
    `).run(branchPointId, choiceId, userSessionId);

    const asset = await resolveAsset(choice.asset_spec);

    return {
      choice: {
        id: choice.id,
        option_label: choice.option_label,
        option_desc: choice.option_desc,
      },
      asset,
      branch_point: { id: point.id, title: point.title, timestamp: point.timestamp },
    };
  }

  getPointStats(branchPointId) {
    const choices = db.prepare(`
      SELECT c.id, c.option_label, COUNT(p.id) as pick_count
      FROM video_branch_choice c
      LEFT JOIN video_branch_user_pick p ON p.choice_id = c.id
      WHERE c.branch_point_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `).all(branchPointId);

    const total = choices.reduce((sum, c) => sum + c.pick_count, 0);
    return {
      total,
      choices: choices.map((c) => ({
        ...c,
        percentage: total > 0 ? Math.round((c.pick_count / total) * 100) : 0,
      })),
    };
  }

  countByVideoId(videoId) {
    return db.prepare(
      'SELECT COUNT(*) as c FROM video_branch_point WHERE video_id = ? AND status = 1',
    ).get(videoId).c;
  }
}

function fsExists(p) {
  try {
    return require('fs').existsSync(p);
  } catch {
    return false;
  }
}

module.exports = new BranchPointService();
