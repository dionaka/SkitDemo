const { ASSET_TYPES, GENERATOR_IDS } = require('./types');
const branchTtsService = require('../branchTtsService');
const branchImageService = require('../branchImageService');

async function resolve(spec) {
  const {
    text,
    voice = 'default',
    provider = 'windows_sapi',
    image_url: presetImageUrl,
    audio_url: presetAudioUrl,
    caption,
    subtitle,
    duration,
    image_api: imageApi,
    drama_genre: dramaGenre,
    series_title: seriesTitle,
    video_title: videoTitle,
    branch_title: branchTitle,
    option_label: optionLabel,
    option_desc: optionDesc,
    image_prompt: imagePrompt,
    narration,
    source_video_url: sourceVideoUrl,
    reference_timestamp: referenceTimestamp,
    reference_frame_url: cachedFrameUrl,
    generation_options: genOpts,
  } = spec;

  const line = text || caption || narration;
  if (!line) {
    throw new Error('tts 生成器需要 text 或 caption');
  }

  const [tts, image] = await Promise.all([
    branchTtsService.ensureAudio({
      text: line,
      voice,
      provider,
      audio_url: presetAudioUrl,
      generation_options: genOpts,
    }),
    branchImageService.ensureImage({
      image_api: imageApi || genOpts?.image_api || 'doubao_i2i',
      image_url: presetImageUrl,
      drama_genre: dramaGenre || genOpts?.drama_genre || 'auto',
      series_title: seriesTitle,
      video_title: videoTitle,
      branch_title: branchTitle,
      option_label: optionLabel,
      option_desc: optionDesc,
      narration: line,
      text: line,
      image_prompt: imagePrompt,
      source_video_url: sourceVideoUrl,
      reference_timestamp: referenceTimestamp,
      reference_frame_url: cachedFrameUrl,
    }),
  ]);

  const imageSubtitle = image.source === 'doubao_i2i' || image.source === 'doubao_i2i_cached'
    ? `图生图 · ${image.genre_label || '短剧'}`
    : image.source === 'doubao_ai' || image.source === 'doubao_ai_cached'
      ? `AI 配图 · ${image.genre_label || '短剧'}`
      : image.source === 'placeholder'
        ? '占位图'
        : '';

  return {
    type: ASSET_TYPES.COMPOSITE,
    generator: GENERATOR_IDS.TTS,
    image_url: image.image_url,
    audio_url: tts.audio_url,
    caption: line,
    subtitle: subtitle || [imageSubtitle, tts.provider ? `TTS · ${tts.provider}` : ''].filter(Boolean).join(' · '),
    duration: duration ?? tts.duration,
    tts_provider: tts.provider,
    image_source: image.source,
    image_mode: image.image_mode,
    reference_frame_url: image.reference_frame_url,
    image_prompt: image.image_prompt,
  };
}

module.exports = { id: GENERATOR_IDS.TTS, resolve };
