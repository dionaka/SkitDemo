const STORAGE_KEY = 'skitdemo_play_prefs';

const DEFAULTS = {
  highlightEnabled: true,
  branchEnabled: true,
  danmakuEnabled: true,
};

export function getPlayPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePlayPreferences(prefs) {
  const next = { ...DEFAULTS, ...getPlayPreferences(), ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
