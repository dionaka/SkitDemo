import { ref } from 'vue';

const STORAGE_KEY = 'skitdemo_api_base_url';

function readStoredUrl() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved.replace(/\/$/, '');
  const envBase = import.meta.env.VITE_API_BASE || '';
  return envBase.replace(/\/$/, '');
}

/** 响应式 API 根地址，供首页等组件监听配置变化 */
export const apiBaseUrl = ref(readStoredUrl());

export function getApiBaseUrl() {
  return apiBaseUrl.value;
}

export function setApiBaseUrl(url) {
  const normalized = (url || '').trim().replace(/\/$/, '');
  if (normalized) {
    localStorage.setItem(STORAGE_KEY, normalized);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  apiBaseUrl.value = normalized;
  return normalized;
}

export function resolveMediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
