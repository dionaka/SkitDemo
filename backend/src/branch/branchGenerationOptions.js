const os = require('os');
const secretsService = require('../services/secretsService');
const { DRAMA_GENRES } = require('./branchImagePrompts');

const DEFAULT_FALLBACK_IMAGE = '/uploads/branches/demo/intro.svg';

const NARRATION_APIS = [
  {
    id: 'doubao',
    label: '豆包 Seed 2.0（视频分析）',
    description: '调用火山方舟 analyzeBranches，自动生成选项与旁白 narration',
    requires_config: 'ai',
  },
  {
    id: 'manual',
    label: '手动填写旁白',
    description: '不调用 AI，在表单中自行填写旁白文案',
    requires_config: null,
  },
];

const TTS_PROVIDERS = [
  {
    id: 'windows_sapi',
    label: 'Windows 本地 SAPI',
    description: '本机语音合成，仅 Windows 可用，无需额外密钥',
    platform: 'win32',
  },
  {
    id: 'doubao_tts',
    label: '豆包语音合成（火山 openspeech）',
    description: '云端 TTS，支持多种音色；后续可配置复刻/训练音色 voice_type',
    requires_config: 'tts',
  },
  {
    id: 'siliconflow_tts',
    label: '硅基流动 CosyVoice2（克隆音色）',
    description: 'SiliconFlow /audio/speech，兼容 astrbot 克隆 voice ID',
    requires_config: 'siliconflow_tts',
  },
  {
    id: 'file',
    label: '上传音频文件',
    description: '使用已上传的 MP3/WAV，不调用合成 API',
    requires_config: null,
  },
];

const IMAGE_APIS = [
  {
    id: 'doubao_i2i',
    label: '豆包 Seedream 图生图（推荐）',
    description: '从主视频分支时刻截帧作为参考图，再按短剧类型与选项生成下一幕插图',
    requires_config: 'image',
  },
  {
    id: 'placeholder',
    label: '占位图（不调用 API）',
    description: '使用默认 SVG 占位，适合未配置图生图密钥时',
    requires_config: null,
  },
  {
    id: 'manual',
    label: '手动指定图片 URL',
    description: '高级：自行填写已上传图片地址',
    requires_config: null,
  },
];

const VISUAL_GENERATORS = [
  {
    id: 'tts',
    label: 'AI 配图 + 配音（composite）',
    description: '图生图插图 + TTS 旁白，适合 AIGC 插入片段演示',
  },
  {
    id: 'video_synth',
    label: 'ffmpeg 原片切片',
    description: '从主视频截取片段播放，旁白作为字幕展示',
  },
  {
    id: 'static',
    label: '静态预上传资源',
    description: '仅解析已上传的图片/视频/音频，需手动上传素材',
  },
];

const DOUBAO_VOICE_PRESETS = [
  { id: 'default', label: '使用配置页默认音色' },
  { id: 'BV700_streaming', label: 'BV700 女声（流式）' },
  { id: 'BV001_streaming', label: 'BV001 通用女声' },
  { id: 'BV002_streaming', label: 'BV002 通用男声' },
  { id: 'zh_male_M392_conversation_wvae_bigtts', label: 'M392 对话男声（大模型）' },
  { id: 'custom', label: '自定义 voice_type（复刻/训练音色）' },
];

function normalizeGenerationOptions(input = {}) {
  return {
    narration_api: input.narration_api === 'manual' ? 'manual' : 'doubao',
    tts_provider: ['windows_sapi', 'doubao_tts', 'siliconflow_tts', 'file'].includes(input.tts_provider)
      ? input.tts_provider
      : 'windows_sapi',
    tts_voice: String(input.tts_voice || 'default'),
    tts_voice_custom: String(input.tts_voice_custom || ''),
    visual_generator: ['tts', 'video_synth', 'static'].includes(input.visual_generator)
      ? input.visual_generator
      : 'tts',
    image_api: ['doubao_i2i', 'doubao_ai', 'placeholder', 'manual'].includes(input.image_api)
      ? (input.image_api === 'doubao_ai' ? 'doubao_i2i' : input.image_api)
      : 'doubao_i2i',
    drama_genre: input.drama_genre || 'auto',
    manual_image_url: input.manual_image_url || '',
    fallback_image_url: input.fallback_image_url || DEFAULT_FALLBACK_IMAGE,
  };
}

function resolveVoice(options) {
  const opts = normalizeGenerationOptions(options);
  if (opts.tts_voice === 'custom' && opts.tts_voice_custom) {
    return opts.tts_voice_custom.trim();
  }
  if (opts.tts_voice && opts.tts_voice !== 'default' && opts.tts_voice !== 'custom') {
    return opts.tts_voice;
  }
  return 'default';
}

function isTtsProviderAvailable(providerId) {
  if (providerId === 'windows_sapi') {
    return os.platform() === 'win32';
  }
  if (providerId === 'doubao_tts') {
    return !!secretsService.getTtsCredentials();
  }
  if (providerId === 'siliconflow_tts') {
    return !!secretsService.getSiliconflowTtsCredentials();
  }
  if (providerId === 'file') {
    return true;
  }
  return false;
}

function buildSiliconflowVoicePresets() {
  const creds = secretsService.getSiliconflowTtsCredentials();
  const presets = [
    { id: 'default', label: '使用配置页默认克隆音色' },
  ];
  if (creds?.voice) {
    const short = creds.voice.length > 36 ? `${creds.voice.slice(0, 36)}…` : creds.voice;
    presets.push({ id: creds.voice, label: `已配置克隆音色 (${short})` });
  }
  presets.push({ id: 'custom', label: '自定义 voice ID' });
  return presets;
}

function isNarrationApiAvailable(apiId) {
  if (apiId === 'manual') return true;
  if (apiId === 'doubao') return !!secretsService.getAiCredentials();
  return false;
}

function isImageApiAvailable(apiId) {
  const id = apiId === 'doubao_ai' ? 'doubao_i2i' : apiId;
  if (apiId === 'placeholder' || apiId === 'manual') return true;
  if (id === 'doubao_i2i') return !!secretsService.getImageCredentials();
  return false;
}

function getCatalog() {
  const aiConfigured = !!secretsService.getAiCredentials();
  const ttsConfigured = !!secretsService.getTtsCredentials();
  const siliconflowConfigured = !!secretsService.getSiliconflowTtsCredentials();
  const imageConfigured = !!secretsService.getImageCredentials();

  return {
    narration_apis: NARRATION_APIS.map((item) => ({
      ...item,
      configured: item.requires_config === 'ai' ? aiConfigured : true,
      available: isNarrationApiAvailable(item.id),
    })),
    tts_providers: TTS_PROVIDERS.map((item) => ({
      ...item,
      configured: item.requires_config === 'tts'
        ? ttsConfigured
        : item.requires_config === 'siliconflow_tts'
          ? siliconflowConfigured
          : true,
      available: isTtsProviderAvailable(item.id),
    })),
    image_apis: IMAGE_APIS.map((item) => ({
      ...item,
      configured: item.requires_config === 'image' ? imageConfigured : true,
      available: isImageApiAvailable(item.id),
    })),
    visual_generators: VISUAL_GENERATORS,
    drama_genres: DRAMA_GENRES,
    voice_presets: DOUBAO_VOICE_PRESETS,
    siliconflow_voice_presets: buildSiliconflowVoicePresets(),
    defaults: normalizeGenerationOptions({}),
    fallback_image_url: DEFAULT_FALLBACK_IMAGE,
  };
}

module.exports = {
  DEFAULT_FALLBACK_IMAGE,
  normalizeGenerationOptions,
  resolveVoice,
  getCatalog,
  isTtsProviderAvailable,
  isNarrationApiAvailable,
  isImageApiAvailable,
};
