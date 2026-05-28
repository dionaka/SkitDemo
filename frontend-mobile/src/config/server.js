const STORAGE_KEY = 'skitdemo_api_base_url';

export function getApiBaseUrl() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved.replace(/\/$/, '');
  const envBase = import.meta.env.VITE_API_BASE || '';
  return envBase.replace(/\/$/, '');
}

export function setApiBaseUrl(url) {
  const normalized = (url || '').trim().replace(/\/$/, '');
  localStorage.setItem(STORAGE_KEY, normalized);
  return normalized;
}

export function resolveMediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
