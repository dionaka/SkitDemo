/** 资源生成器 ID — 新增 TTS / 视频合成时在此扩展 */
const GENERATOR_IDS = {
  STATIC: 'static',
  TTS: 'tts',
  VIDEO_SYNTH: 'video_synth',
};

/** 节点资源类型 */
const ASSET_TYPES = {
  VIDEO: 'video',
  COMPOSITE: 'composite',
};

/** 节点角色 */
const NODE_TYPES = {
  SEGMENT: 'segment',
  ENDING: 'ending',
};

module.exports = { GENERATOR_IDS, ASSET_TYPES, NODE_TYPES };
