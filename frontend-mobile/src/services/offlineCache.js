import { resolveMediaUrl } from '@/config/server';

const MANIFEST_KEY = 'skitdemo_offline_cache_v1';
const IDB_NAME = 'skitdemo_offline_cache';
const IDB_STORE = 'videos';
const FLUSH_EVERY_BYTES = 256 * 1024;

function readManifest() {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    if (!raw) return { items: {} };
    const parsed = JSON.parse(raw);
    return parsed?.items ? parsed : { items: {} };
  } catch {
    return { items: {} };
  }
}

function writeManifest(manifest) {
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(videoId, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, String(videoId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(videoId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(String(videoId));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(videoId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(String(videoId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function calcProgress(received, total) {
  if (total > 0) return Math.min(100, Math.round((received / total) * 100));
  if (received > 0) return Math.min(99, Math.round(received / (1024 * 1024)));
  return 0;
}

/** App 退出时把「下载中」标记为「已暂停」，便于继续 */
export function normalizeInterruptedDownloads() {
  const manifest = readManifest();
  let changed = false;
  for (const key of Object.keys(manifest.items)) {
    const item = manifest.items[key];
    if (item.status === 'downloading') {
      manifest.items[key] = {
        ...item,
        status: 'paused',
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }
  }
  if (changed) writeManifest(manifest);
}

export function formatCacheSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function listOfflineCacheItems() {
  const manifest = readManifest();
  return Object.values(manifest.items).sort((a, b) => {
    const ta = new Date(b.updatedAt || 0).getTime();
    const tb = new Date(a.updatedAt || 0).getTime();
    return ta - tb;
  });
}

export function getOfflineCacheItem(videoId) {
  return readManifest().items[String(videoId)] || null;
}

export function isVideoCached(videoId) {
  const item = getOfflineCacheItem(videoId);
  return item?.status === 'completed';
}

export function canResumeDownload(videoId) {
  const item = getOfflineCacheItem(videoId);
  return item?.status === 'paused' || item?.status === 'failed';
}

export function buildVideoRecordFromCache(item) {
  if (!item) return null;
  return {
    id: item.videoId,
    series_id: item.seriesId || null,
    series_title: item.seriesTitle || '短剧',
    episode_number: item.episodeNumber,
    title: item.title || `第 ${item.episodeNumber} 集`,
    cover_url: item.coverUrl || '',
    video_url: item.remoteUrl || '',
    total_duration: 0,
  };
}

export function listCompletedOfflineItems() {
  return listOfflineCacheItems().filter((i) => i.status === 'completed');
}

function upsertItem(videoId, patch) {
  const manifest = readManifest();
  const key = String(videoId);
  manifest.items[key] = {
    ...(manifest.items[key] || {}),
    videoId: Number(videoId),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeManifest(manifest);
  return manifest.items[key];
}

function removeItem(videoId) {
  const manifest = readManifest();
  delete manifest.items[String(videoId)];
  writeManifest(manifest);
}

async function fetchVideoPart(remoteUrl, startByte) {
  if (startByte > 0) {
    const ranged = await fetch(remoteUrl, { headers: { Range: `bytes=${startByte}-` } });
    if (ranged.ok && (ranged.status === 206 || ranged.status === 200)) {
      return ranged;
    }
  }
  return fetch(remoteUrl);
}

function parseTotalBytes(response, startByte) {
  const contentRange = response.headers.get('content-range');
  const rangeMatch = contentRange?.match(/\/(\d+)$/);
  if (rangeMatch) return Number(rangeMatch[1]);

  const len = Number(response.headers.get('content-length') || 0);
  if (response.status === 206) return len + startByte;
  return len;
}

async function downloadToIdbResumable(remoteUrl, videoId, existingItem, onMeta, onProgress) {
  let startByte = 0;
  let parts = [];

  if (existingItem?.status === 'paused' || existingItem?.status === 'failed') {
    const partial = await idbGet(videoId);
    if (partial?.size) {
      parts = [partial];
      startByte = partial.size;
    } else if (existingItem.downloadedBytes > 0) {
      startByte = existingItem.downloadedBytes;
    }
  }

  const response = await fetchVideoPart(remoteUrl, startByte);
  if (!response.ok) throw new Error(`下载失败 (${response.status})`);

  const total = parseTotalBytes(response, startByte) || existingItem?.totalBytes || 0;
  onMeta?.({ totalBytes: total, downloadedBytes: startByte });

  const reader = response.body?.getReader();
  if (!reader) throw new Error('当前环境不支持流式下载');

  let received = startByte;
  let lastFlushAt = startByte;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    parts.push(value);
    received += value.length;

    const progress = calcProgress(received, total);
    onProgress?.(progress, received, total);

    if (received - lastFlushAt >= FLUSH_EVERY_BYTES) {
      const partialBlob = new Blob(parts, { type: response.headers.get('content-type') || 'video/mp4' });
      await idbPut(videoId, partialBlob);
      parts = [partialBlob];
      lastFlushAt = received;
      onMeta?.({ totalBytes: total, downloadedBytes: received, progress });
    }
  }

  const blob = new Blob(parts, { type: response.headers.get('content-type') || 'video/mp4' });
  await idbPut(videoId, blob);
  return { fileSize: blob.size, totalBytes: total || blob.size };
}

export async function resolveOfflinePlayUrl(videoId) {
  const item = getOfflineCacheItem(videoId);
  if (!item || item.status !== 'completed') return null;

  const blob = await idbGet(videoId);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function downloadOfflineVideo(payload, onProgress) {
  const videoId = Number(payload.videoId);
  if (!videoId) throw new Error('无效的视频 ID');

  const remoteUrl = resolveMediaUrl(payload.videoUrl || payload.remoteUrl);
  if (!remoteUrl) throw new Error('无法解析视频地址');

  const existing = getOfflineCacheItem(videoId);
  if (existing?.status === 'completed') {
    onProgress?.(100);
    return existing;
  }

  upsertItem(videoId, {
    seriesId: payload.seriesId,
    seriesTitle: payload.seriesTitle || '',
    episodeNumber: payload.episodeNumber,
    title: payload.title || '',
    coverUrl: payload.coverUrl || '',
    remoteUrl,
    localPath: `idb:${videoId}`,
    status: 'downloading',
    progress: existing?.progress || 0,
    downloadedBytes: existing?.downloadedBytes || 0,
    totalBytes: existing?.totalBytes || 0,
    error: '',
  });

  try {
    const result = await downloadToIdbResumable(
      remoteUrl,
      videoId,
      existing,
      (meta) => {
        upsertItem(videoId, {
          totalBytes: meta.totalBytes,
          downloadedBytes: meta.downloadedBytes,
          progress: meta.progress ?? calcProgress(meta.downloadedBytes, meta.totalBytes),
        });
      },
      (progress, downloadedBytes, totalBytes) => {
        upsertItem(videoId, { progress, downloadedBytes, totalBytes });
        onProgress?.(progress);
      },
    );

    return upsertItem(videoId, {
      status: 'completed',
      progress: 100,
      fileSize: result.fileSize,
      totalBytes: result.totalBytes,
      downloadedBytes: result.fileSize,
      error: '',
    });
  } catch (err) {
    const partial = await idbGet(videoId);
    const downloadedBytes = partial?.size || existing?.downloadedBytes || 0;
    upsertItem(videoId, {
      status: downloadedBytes > 0 ? 'paused' : 'failed',
      downloadedBytes,
      progress: calcProgress(downloadedBytes, existing?.totalBytes || 0),
      error: err.message || '下载中断',
    });
    throw err;
  }
}

export async function removeOfflineVideo(videoId) {
  if (!getOfflineCacheItem(videoId)) return;
  await idbDelete(videoId);
  removeItem(videoId);
}

export async function clearOfflineCache() {
  const items = listOfflineCacheItems();
  await idbClear();
  writeManifest({ items: {} });
  if (items.length === 0) return;
}

export function getOfflineCacheStats() {
  const items = listOfflineCacheItems();
  const completed = items.filter((i) => i.status === 'completed');
  const paused = items.filter((i) => i.status === 'paused' || i.status === 'downloading');
  const totalBytes = completed.reduce((sum, i) => sum + (i.fileSize || 0), 0);
  return {
    count: completed.length,
    paused: paused.length,
    totalBytes,
  };
}

export function isOfflineCacheSupported() {
  return typeof indexedDB !== 'undefined';
}
