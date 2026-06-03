/** 首页分类横滑灵敏度：1 低 ~ 5 高，默认 3 为当前标准手感 */
export const CATEGORY_SWIPE_SENSITIVITY_MIN = 1;
export const CATEGORY_SWIPE_SENSITIVITY_MAX = 5;
export const CATEGORY_SWIPE_SENSITIVITY_DEFAULT = 3;

const LABELS = ['', '低', '较低', '标准', '较高', '高'];

/**
 * 各档参数刻意拉开差距，便于在设置里能明显感受到差异：
 * - 低：需拖更远才翻页、跟手偏慢、轻扫不触发
 * - 高：短拖/轻扫即可翻页、跟手更快
 */
const PRESETS = {
  1: {
    flingEnabled: false,
    flingVelocity: 1,
    dragGain: 0.72,
    commitRatio: 0.22,
    minCommitPx: 80,
    halfPageRatio: 0.42,
    axisMinPx: 10,
    verticalDyMin: 8,
    verticalLockRatio: 1.25,
    horizontalBias: 0.92,
  },
  2: {
    flingEnabled: true,
    flingVelocity: 0.35,
    dragGain: 0.9,
    commitRatio: 0.14,
    minCommitPx: 52,
    halfPageRatio: 0.3,
    axisMinPx: 7,
    verticalDyMin: 10,
    verticalLockRatio: 1.45,
    horizontalBias: 0.7,
  },
  3: {
    flingEnabled: true,
    flingVelocity: 0.08,
    dragGain: 1.2,
    commitRatio: 0.035,
    minCommitPx: 18,
    halfPageRatio: 0.14,
    axisMinPx: 2,
    verticalDyMin: 14,
    verticalLockRatio: 1.75,
    horizontalBias: 0.3,
  },
  4: {
    flingEnabled: true,
    flingVelocity: 0.045,
    dragGain: 1.45,
    commitRatio: 0.018,
    minCommitPx: 10,
    halfPageRatio: 0.09,
    axisMinPx: 1,
    verticalDyMin: 16,
    verticalLockRatio: 2.1,
    horizontalBias: 0.16,
  },
  5: {
    flingEnabled: true,
    flingVelocity: 0.022,
    dragGain: 1.9,
    commitRatio: 0.008,
    minCommitPx: 4,
    halfPageRatio: 0.04,
    axisMinPx: 1,
    verticalDyMin: 20,
    verticalLockRatio: 2.8,
    horizontalBias: 0.08,
  },
};

export function clampCategorySwipeSensitivity(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return CATEGORY_SWIPE_SENSITIVITY_DEFAULT;
  return Math.max(
    CATEGORY_SWIPE_SENSITIVITY_MIN,
    Math.min(CATEGORY_SWIPE_SENSITIVITY_MAX, n),
  );
}

export function getCategorySwipeSensitivityLabel(level) {
  return LABELS[clampCategorySwipeSensitivity(level)] || LABELS[CATEGORY_SWIPE_SENSITIVITY_DEFAULT];
}

export function resolveCategorySwipeSensitivity(level) {
  const lv = clampCategorySwipeSensitivity(level);
  return PRESETS[lv] || PRESETS[CATEGORY_SWIPE_SENSITIVITY_DEFAULT];
}

/** 设置页提示：大约需要拖多少屏宽才会翻页 */
export function getCategorySwipeSensitivityHint(level, viewportWidth = 390) {
  const cfg = resolveCategorySwipeSensitivity(level);
  const w = Math.max(viewportWidth, 320);
  const commitPx = Math.max(cfg.minCommitPx, w * cfg.commitRatio);
  const pct = Math.round((commitPx / w) * 100);
  if (!cfg.flingEnabled) {
    return `约需拖动 ${pct}% 屏宽才翻页，轻扫无效`;
  }
  if (pct <= 6) {
    return `短拖或轻扫即可翻页（约 ${pct}% 屏宽）`;
  }
  if (pct >= 18) {
    return `需明显横向拖动（约 ${pct}% 屏宽）才翻页`;
  }
  return `拖动约 ${pct}% 屏宽，或快速轻扫即可翻页`;
}
