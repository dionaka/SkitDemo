/** 高光激发特效注册表：新增类型只需在此扩展 */
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
  burst: {
    css: null,
    duration: 2000,
    particles: 'confetti_burst',
    label: '庆祝 · 全屏撒花（预留）',
  },
};

export function resolveEffectKey(highlight) {
  const key = highlight?.effect_key || highlight?.category;
  if (key && EFFECT_REGISTRY[key]) return key;
  return 'scene';
}

export function getEffectMeta(key) {
  return EFFECT_REGISTRY[key] || EFFECT_REGISTRY.scene;
}

export const EFFECT_KEY_OPTIONS = Object.entries(EFFECT_REGISTRY).map(([value, meta]) => ({
  value,
  label: meta.label,
}));
