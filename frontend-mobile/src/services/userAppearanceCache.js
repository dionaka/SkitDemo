import { resolveMediaUrl } from '@/config/server';

const CACHE_KEY = 'skitdemo_user_appearance_v1';
const AVATAR_DATA_KEY = 'app_avatar_data_url';
const AVATAR_SOURCE_KEY = 'app_avatar_data_source';
const MAX_AVATAR_BYTES = 120 * 1024;
const MAX_BACKGROUND_BYTES = 900 * 1024;

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(store));
}

function cacheKey(userId) {
  return userId != null ? String(userId) : '';
}

export function getAppearanceCache(userId) {
  const key = cacheKey(userId);
  if (!key) return null;
  return readStore()[key] || null;
}

function saveAppearanceCache(userId, entry) {
  const key = cacheKey(userId);
  if (!key) return;
  const store = readStore();
  store[key] = entry;
  writeStore(store);
}

export function clearAppearanceCache(userId) {
  const key = cacheKey(userId);
  if (!key) return;
  const store = readStore();
  delete store[key];
  writeStore(store);
  clearAvatarDataUrl();
}

function clearAvatarDataUrl() {
  localStorage.removeItem(AVATAR_DATA_KEY);
  localStorage.removeItem(AVATAR_SOURCE_KEY);
}

function persistAvatarDataUrl(sourceUrl, dataUrl) {
  if (!dataUrl) {
    clearAvatarDataUrl();
    return;
  }
  localStorage.setItem(AVATAR_DATA_KEY, dataUrl);
  localStorage.setItem(AVATAR_SOURCE_KEY, sourceUrl || '');
}

export function readAvatarDataUrl(sourceUrl = '') {
  const cached = localStorage.getItem(AVATAR_DATA_KEY) || '';
  const cachedSource = localStorage.getItem(AVATAR_SOURCE_KEY) || '';
  if (!cached) return '';
  if (sourceUrl && cachedSource && cachedSource !== sourceUrl) return '';
  return cached;
}

export function resolveCachedAvatarUrl(sourceUrl = '') {
  if (!sourceUrl) return '';
  const cached = readAvatarDataUrl(sourceUrl);
  if (cached) return cached;
  if (sourceUrl.startsWith('data:')) return sourceUrl;
  return '';
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

async function compressDataUrl(dataUrl, maxWidth, quality, maxBytes) {
  try {
    const img = await loadImage(dataUrl);
    let width = maxWidth;
    let q = quality;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const scale = Math.min(1, width / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.drawImage(img, 0, 0, w, h);
      const next = canvas.toDataURL('image/jpeg', q);
      if (estimateDataUrlBytes(next) <= maxBytes) return next;
      width = Math.round(width * 0.75);
      q = Math.max(0.5, q - 0.08);
    }
    return '';
  } catch {
    return '';
  }
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageDataUrl(sourceUrl, maxWidth, quality, maxBytes) {
  if (!sourceUrl) return '';
  if (sourceUrl.startsWith('data:')) {
    if (estimateDataUrlBytes(sourceUrl) <= maxBytes) return sourceUrl;
    return compressDataUrl(sourceUrl, maxWidth, quality, maxBytes);
  }

  const url = resolveMediaUrl(sourceUrl);
  if (!url) return '';

  try {
    const response = await fetch(url);
    if (!response.ok) return '';
    const blob = await response.blob();
    const raw = await blobToDataUrl(blob);
    if (estimateDataUrlBytes(raw) <= maxBytes) return raw;
    return compressDataUrl(raw, maxWidth, quality, maxBytes);
  } catch {
    return '';
  }
}

function buildDisplayPayload(cache) {
  if (!cache?.cloud) return null;
  const payload = { ...cache.cloud };
  if (cache.assets?.backgroundDataUrl) {
    payload.background_url = cache.assets.backgroundDataUrl;
  }
  return payload;
}

export function applyAppearanceCache(userId) {
  const cache = getAppearanceCache(userId);
  if (!cache) return false;

  const payload = buildDisplayPayload(cache);
  if (payload) {
    import('@/services/userCloudSync').then(({ applyUserBackgroundPayload }) => {
      applyUserBackgroundPayload(payload, { persistCache: false });
    });
  }

  if (cache.assets?.avatarDataUrl) {
    persistAvatarDataUrl(cache.assets.avatarUrl || '', cache.assets.avatarDataUrl);
  }

  return Boolean(payload || cache.assets?.avatarDataUrl);
}

let persistTimer = null;

export function schedulePersistAppearanceCache(cloudData) {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistAppearanceCache(cloudData).catch(() => {});
  }, 300);
}

export async function persistAppearanceCache(cloudData) {
  const { useSessionStore } = await import('@/stores/session');
  const session = useSessionStore();
  if (!session.isLoggedIn || !session.userId || !cloudData) return;

  const existing = getAppearanceCache(session.userId);
  const backgroundUrl = cloudData.background_url?.startsWith('data:')
    ? (existing?.cloud?.background_url || '')
    : (cloudData.background_url || '');

  const assets = {
    avatarUrl: session.avatarUrl || '',
    avatarDataUrl: '',
    backgroundUrl,
    backgroundDataUrl: '',
  };

  if (assets.avatarUrl) {
    assets.avatarDataUrl = await fetchImageDataUrl(
      assets.avatarUrl,
      256,
      0.82,
      MAX_AVATAR_BYTES,
    );
  }

  if (assets.backgroundUrl && !assets.backgroundUrl.startsWith('data:')) {
    assets.backgroundDataUrl = await fetchImageDataUrl(
      assets.backgroundUrl,
      1080,
      0.72,
      MAX_BACKGROUND_BYTES,
    );
  }

  saveAppearanceCache(session.userId, {
    userId: session.userId,
    updatedAt: Date.now(),
    cloud: {
      background_url: backgroundUrl,
      overlay_opacity: cloudData.overlay_opacity,
      blur: cloudData.blur,
      skin_data: cloudData.skin_data ?? null,
    },
    assets,
  });

  if (assets.avatarDataUrl) {
    persistAvatarDataUrl(assets.avatarUrl, assets.avatarDataUrl);
  }
}

export async function persistAvatarFromFile(sourceUrl, file) {
  const { useSessionStore } = await import('@/stores/session');
  const session = useSessionStore();
  if (!session.userId || !file) return;

  try {
    const raw = await blobToDataUrl(file);
    const avatarDataUrl = await compressDataUrl(raw, 256, 0.82, MAX_AVATAR_BYTES);
    if (!avatarDataUrl) return;

    persistAvatarDataUrl(sourceUrl, avatarDataUrl);
    const cache = getAppearanceCache(session.userId) || {
      userId: session.userId,
      cloud: {},
      assets: {},
    };
    cache.assets = {
      ...cache.assets,
      avatarUrl: sourceUrl,
      avatarDataUrl,
    };
    cache.updatedAt = Date.now();
    saveAppearanceCache(session.userId, cache);
  } catch {
    /* ignore */
  }
}
