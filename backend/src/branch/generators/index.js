const staticGenerator = require('./static');
const ttsGenerator = require('./tts');
const videoSynthGenerator = require('./videoSynth');
const { GENERATOR_IDS } = require('./types');

const registry = new Map([
  [GENERATOR_IDS.STATIC, staticGenerator],
  [GENERATOR_IDS.TTS, ttsGenerator],
  [GENERATOR_IDS.VIDEO_SYNTH, videoSynthGenerator],
]);

/**
 * 注册新生成器（TTS、视频合成等）
 * @param {string} id
 * @param {{ resolve: (spec: object) => Promise<object> }} generator
 */
function registerGenerator(id, generator) {
  if (!id || typeof generator?.resolve !== 'function') {
    throw new Error('registerGenerator: 无效的生成器');
  }
  registry.set(id, generator);
}

/**
 * 将 DB 中的 asset_spec JSON 解析为前端可播放资源
 */
async function resolveAsset(assetSpec) {
  const spec = typeof assetSpec === 'string' ? JSON.parse(assetSpec) : assetSpec;
  const generatorId = spec.generator || GENERATOR_IDS.STATIC;
  const generator = registry.get(generatorId);
  if (!generator) {
    throw new Error(`未注册的生成器: ${generatorId}`);
  }
  return generator.resolve(spec);
}

function listGenerators() {
  return Array.from(registry.keys());
}

module.exports = {
  registerGenerator,
  resolveAsset,
  listGenerators,
  GENERATOR_IDS,
};
