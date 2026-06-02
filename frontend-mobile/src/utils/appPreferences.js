const STORAGE_KEY = 'skitdemo_app_prefs';
const LEGACY_STORAGE_KEY = 'skitdemo_home_prefs';

const DEFAULTS = {
  showContinueWatching: true,
  /** 沉浸式状态栏：内容延伸到顶部，使用安全区留白 */
  immersiveStatusBar: false,
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
  return { ...DEFAULTS, ...parsed };
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
