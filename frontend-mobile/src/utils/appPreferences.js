const STORAGE_KEY = 'skitdemo_app_prefs';
const LEGACY_STORAGE_KEY = 'skitdemo_home_prefs';

import {
  CATEGORY_SWIPE_SENSITIVITY_DEFAULT,
  clampCategorySwipeSensitivity,
} from './categorySwipeSensitivity';

const DEFAULTS = {
  showContinueWatching: true,
  /** 沉浸式状态栏：内容延伸到顶部，使用安全区留白 */
  immersiveStatusBar: false,
  /** 首页热门/推荐/最新横滑灵敏度：1 低 ~ 5 高 */
  categorySwipeSensitivity: CATEGORY_SWIPE_SENSITIVITY_DEFAULT,
};

function readStoredPreferences() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAppPreferences() {
  const parsed = readStoredPreferences();
  if (!parsed) return { ...DEFAULTS };
  return {
    ...DEFAULTS,
    ...parsed,
    categorySwipeSensitivity: clampCategorySwipeSensitivity(
      parsed.categorySwipeSensitivity ?? DEFAULTS.categorySwipeSensitivity,
    ),
  };
}

/** @deprecated use getAppPreferences */
export function getHomePreferences() {
  return getAppPreferences();
}

export function saveAppPreferences(prefs) {
  const next = { ...DEFAULTS, ...getAppPreferences(), ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** @deprecated use saveAppPreferences */
export function saveHomePreferences(prefs) {
  return saveAppPreferences(prefs);
}
