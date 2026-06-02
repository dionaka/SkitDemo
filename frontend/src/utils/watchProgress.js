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

export function clearLocalProgress(videoId) {
  localStorage.removeItem(`${PREFIX}${videoId}`);
}

export function clearLocalProgressBatch(videoIds) {
  (videoIds || []).forEach((id) => clearLocalProgress(id));
}

export function formatProgressLabel(seconds, total) {
  const raw = Number(seconds) || 0;
  const maxTotal = Number(total) || 0;
  const safeSeconds = maxTotal > 0 ? Math.min(raw, maxTotal) : raw;
  if (!maxTotal || safeSeconds < 5) return '';
  const pct = Math.min(100, Math.round((safeSeconds / maxTotal) * 100));
  if (pct >= 95) return '已看完';
  const m = Math.floor(safeSeconds / 60);
  const s = Math.floor(safeSeconds % 60);
  return `看到 ${m}:${String(s).padStart(2, '0')} (${pct}%)`;
}

export function clampProgressSeconds(seconds, total) {
  const pos = Math.max(0, Number(seconds) || 0);
  const maxTotal = Number(total) || 0;
  if (maxTotal > 0) return Math.min(pos, maxTotal);
  return pos;
}
