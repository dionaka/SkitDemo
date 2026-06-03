import { defineStore } from 'pinia';
import {
  clearOfflineCache,
  downloadOfflineVideo,
  formatCacheSize,
  getOfflineCacheItem,
  getOfflineCacheStats,
  isOfflineCacheSupported,
  isVideoCached,
  listOfflineCacheItems,
  removeOfflineVideo,
  resolveOfflinePlayUrl,
  normalizeInterruptedDownloads,
} from '@/services/offlineCache';

export const useOfflineCacheStore = defineStore('offlineCache', {
  state: () => ({
    items: [],
    playUrls: {},
    activeDownloadId: null,
    hydrated: false,
  }),
  getters: {
    stats(state) {
      const completed = state.items.filter((i) => i.status === 'completed');
      const downloading = state.items.filter((i) => i.status === 'downloading');
      const totalBytes = completed.reduce((sum, i) => sum + (i.fileSize || 0), 0);
      return {
        count: completed.length,
        downloading: downloading.length,
        totalBytes,
        totalLabel: formatCacheSize(totalBytes),
      };
    },
    supported: () => isOfflineCacheSupported(),
    completedItems: (state) => state.items.filter((i) => i.status === 'completed'),
    pausedItems: (state) => state.items.filter((i) => i.status === 'paused' || i.status === 'failed'),
  },
  actions: {
    refresh() {
      this.items = listOfflineCacheItems();
    },
    hydrate() {
      normalizeInterruptedDownloads();
      this.refresh();
      this.hydrated = true;
    },
    isCached(videoId) {
      return isVideoCached(videoId);
    },
    getItem(videoId) {
      return getOfflineCacheItem(videoId);
    },
    getProgress(videoId) {
      return getOfflineCacheItem(videoId)?.progress || 0;
    },
    async ensurePlayUrl(videoId) {
      const id = Number(videoId);
      if (!id || !this.isCached(id)) return null;
      if (this.playUrls[id]) return this.playUrls[id];
      const url = await resolveOfflinePlayUrl(id);
      if (url) this.playUrls = { ...this.playUrls, [id]: url };
      return url;
    },
    async download(payload) {
      const videoId = Number(payload.videoId);
      if (!videoId) throw new Error('无效的视频 ID');
      if (this.activeDownloadId && this.activeDownloadId !== videoId) {
        throw new Error('已有任务正在下载，请稍候');
      }
      if (this.isCached(videoId)) return this.getItem(videoId);

      const existing = this.getItem(videoId);
      if (existing?.status === 'downloading') {
        throw new Error('该分集正在下载中');
      }

      this.activeDownloadId = videoId;
      try {
        const item = await downloadOfflineVideo(payload, () => {
          this.refresh();
        });
        this.refresh();
        await this.ensurePlayUrl(videoId);
        return item;
      } finally {
        if (this.activeDownloadId === videoId) this.activeDownloadId = null;
        this.refresh();
      }
    },
    async remove(videoId) {
      const id = Number(videoId);
      await removeOfflineVideo(id);
      const next = { ...this.playUrls };
      if (next[id]) {
        if (next[id].startsWith('blob:')) URL.revokeObjectURL(next[id]);
        delete next[id];
      }
      this.playUrls = next;
      this.refresh();
    },
    async clearAll() {
      const urls = { ...this.playUrls };
      Object.values(urls).forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      await clearOfflineCache();
      this.playUrls = {};
      this.refresh();
    },
    syncStats() {
      this.refresh();
      return getOfflineCacheStats();
    },
  },
});
