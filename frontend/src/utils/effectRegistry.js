import { HIGHLIGHT_CATEGORIES } from '@/config/highlightCategories';

/** 高光激发特效注册表：category 默认同名 effect_key，也可在管理端单独指定 */
export const EFFECT_REGISTRY = {
  conflict: {
    css: 'conflict',
    duration: 2500,
    particles: 'none',
    label: '冲突 · 闪电',
  },
  reversal: {
    css: 'reversal',
    duration: 2500,
    particles: 'none',
    label: '反转 · 震动',
  },
  sweet: {
    css: 'sweet',
    duration: 2500,
    particles: 'hearts_confetti',
    label: '撒糖 · 飘心',
  },
  scene: {
    css: 'scene',
    duration: 2800,
    particles: 'confetti',
    label: '名场面 · 弹幕+彩带',
  },
  suspense: {
    css: 'suspense',
    duration: 2600,
    particles: 'suspense_mist',
    label: '悬疑 · 迷雾',
  },
  funny: {
    css: 'funny',
    duration: 2400,
    particles: 'funny_pop',
    label: '搞笑 · 弹跳',
  },
  touch: {
    css: 'touch',
    duration: 2800,
    particles: 'touch_sparkle',
    label: '催泪 · 雨滴',
  },
  rage: {
    css: 'rage',
    duration: 2500,
    particles: 'fire_burst',
    label: '高燃 · 火焰',
  },
  shock: {
    css: 'shock',
    duration: 2000,
    particles: 'shock_flash',
    label: '震惊 · 闪白',
  },
  quote: {
    css: 'quote',
    duration: 3000,
    particles: 'quote_sparkle',
    label: '金句 · 台词飘屏',
  },
  burst: {
    css: null,
    duration: 2000,
    particles: 'confetti_burst',
    label: '庆祝 · 全屏撒花',
  },
};

export function resolveEffectKey(highlight) {
  const key = highlight?.effect_key || highlight?.category;
  if (key && EFFECT_REGISTRY[key]) return key;
  if (key && HIGHLIGHT_CATEGORIES[key]) return key;
  return 'scene';
}

export function getEffectMeta(key) {
  if (EFFECT_REGISTRY[key]) return EFFECT_REGISTRY[key];
  if (HIGHLIGHT_CATEGORIES[key]) {
    return EFFECT_REGISTRY.scene;
  }
  return EFFECT_REGISTRY.scene;
}

export const EFFECT_KEY_OPTIONS = Object.entries(EFFECT_REGISTRY).map(([value, meta]) => ({
  value,
  label: meta.label,
}));
