const { ASSET_TYPES } = require('./types');

/**
 * 静态预生成资源解析器
 * 从 asset_spec JSON 解析为前端可直接播放的结构
 */
async function resolve(spec) {
  if (!spec || !spec.type) {
    throw new Error('asset_spec 缺少 type 字段');
  }

  switch (spec.type) {
    case ASSET_TYPES.VIDEO:
      return {
        type: ASSET_TYPES.VIDEO,
        generator: spec.generator || 'static',
        video_url: spec.video_url,
        start_at: spec.start_at ?? 0,
        end_at: spec.end_at ?? null,
        caption: spec.caption || '',
        duration: spec.duration ?? null,
      };

    case ASSET_TYPES.COMPOSITE:
      return {
        type: ASSET_TYPES.COMPOSITE,
        generator: spec.generator || 'static',
        image_url: spec.image_url || null,
        audio_url: spec.audio_url || null,
        caption: spec.caption || '',
        subtitle: spec.subtitle || '',
        duration: spec.duration ?? 6,
      };

    default:
      throw new Error(`static 生成器不支持 type: ${spec.type}`);
  }
}

module.exports = { id: 'static', resolve };
