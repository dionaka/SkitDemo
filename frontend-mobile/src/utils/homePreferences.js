const STORAGE_KEY = 'skitdemo_home_prefs';

const DEFAULTS = {
  showContinueWatching: true,
};

export function getHomePreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveHomePreferences(prefs) {
  const next = { ...DEFAULTS, ...getHomePreferences(), ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
