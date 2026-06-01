const { ASSET_TYPES, GENERATOR_IDS } = require('./types');
const branchClipService = require('../branchClipService');

async function resolve(spec) {
  const {
    source_video_url: sourceVideoUrl,
    start_at: startAt = 0,
    end_at: endAt,
    duration,
    caption = '',
    subtitle = '',
  } = spec;

  if (!sourceVideoUrl) {
    throw new Error('video_synth 需要 source_video_url');
  }

  const videoUrl = await branchClipService.ensureClip({
    sourceVideoUrl,
    startAt,
    endAt,
    duration,
  });

  if (!videoUrl) {
    const fallbackImage = spec.fallback_image_url || '/uploads/branches/demo/intro.svg';
    return {
      type: ASSET_TYPES.COMPOSITE,
      generator: GENERATOR_IDS.VIDEO_SYNTH,
      image_url: fallbackImage,
      caption,
      subtitle: `${subtitle || ''} · 源视频不可用，已降级`.trim(),
      duration: duration ?? (endAt != null ? endAt - startAt : 6),
    };
  }

  return {
    type: ASSET_TYPES.VIDEO,
    generator: GENERATOR_IDS.VIDEO_SYNTH,
    video_url: videoUrl,
    source_video_url: sourceVideoUrl,
    start_at: startAt,
    end_at: endAt,
    caption,
    subtitle,
    duration: duration ?? (endAt != null ? endAt - startAt : null),
  };
}

module.exports = { id: GENERATOR_IDS.VIDEO_SYNTH, resolve };
