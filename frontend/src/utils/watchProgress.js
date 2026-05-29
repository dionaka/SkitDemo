const PREFIX = 'skitdemo_watch_';

export function getLocalProgress(videoId) {
  const raw = localStorage.getItem(`${PREFIX}${videoId}`);
  if (raw == null) return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function setLocalProgress(videoId, seconds) {
  localStorage.setItem(`${PREFIX}${videoId}`, String(Math.max(0, seconds)));
}

export function formatProgressLabel(seconds, total) {
  if (!total || seconds < 5) return '';
  const pct = Math.min(100, Math.round((seconds / total) * 100));
  if (pct >= 95) return '已看完';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `看到 ${m}:${String(s).padStart(2, '0')} (${pct}%)`;
}
