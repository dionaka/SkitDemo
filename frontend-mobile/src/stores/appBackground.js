import { defineStore } from 'pinia';
import {
  updateUserBackground,
  uploadUserBackground,
  clearUserBackground,
  getUserBackgroundOnce,
} from '@/api/background';
import {
  BACKGROUND_DEFAULTS,
  normalizeBackgroundPayload,
  isBackgroundActive,
  getBackgroundLayerStyle,
  getBackgroundScrimStyle,
  resolveBackgroundImageUrl,
  processBackgroundImageFile,
  applyBackgroundDocumentClass,
  clearLegacyBackgroundStorage,
} from '@/utils/appBackground';
import { useSessionStore } from '@/stores/session';
import { schedulePersistAppearanceCache } from '@/services/userAppearanceCache';

let settingsTimer = null;

function cacheCloudPayload(data) {
  if (data) schedulePersistAppearanceCache(data);
}

export const useAppBackgroundStore = defineStore('appBackground', {
  state: () => ({
    ...BACKGROUND_DEFAULTS,
    loading: false,
    syncing: false,
  }),
  getters: {
    isActive(state) {
      return isBackgroundActive(state);
    },
    imageUrl(state) {
      return resolveBackgroundImageUrl(state.backgroundUrl);
    },
    navBackgroundImage(state) {
      return resolveBackgroundImageUrl(state.backgroundUrl);
    },
    layerStyle(state) {
      return getBackgroundLayerStyle(state);
    },
    scrimStyle(state) {
      return getBackgroundScrimStyle(state);
    },
  },
  actions: {
    syncDocumentClass() {
      applyBackgroundDocumentClass(this.isActive);
    },
    applyPayload(data) {
      const next = normalizeBackgroundPayload(data);
      this.backgroundUrl = next.backgroundUrl;
      this.overlayOpacity = next.overlayOpacity;
      this.blur = next.blur;
      this.syncDocumentClass();
    },
    resetLocal() {
      this.applyPayload(BACKGROUND_DEFAULTS);
    },
    async fetchFromCloud() {
      const session = useSessionStore();
      if (!session.isLoggedIn) {
        this.resetLocal();
        return null;
      }

      this.loading = true;
      try {
        const data = await getUserBackgroundOnce(session.userSessionId);
        this.applyPayload(data);
        cacheCloudPayload(data);
        return data;
      } catch {
        this.resetLocal();
        return null;
      } finally {
        this.loading = false;
      }
    },
    queueSaveSettings() {
      clearTimeout(settingsTimer);
      settingsTimer = setTimeout(() => {
        this.saveSettings().catch(() => {});
      }, 350);
    },
    async saveSettings() {
      const session = useSessionStore();
      if (!session.isLoggedIn) throw new Error('请先登录');

      this.syncing = true;
      try {
        const data = await updateUserBackground(session.userSessionId, {
          overlay_opacity: this.overlayOpacity,
          blur: this.blur,
        });
        this.applyPayload(data);
        cacheCloudPayload(data);
        return data;
      } finally {
        this.syncing = false;
      }
    },
    setOverlayOpacity(value) {
      this.overlayOpacity = Math.max(0, Math.min(85, Number(value) || 0));
      this.syncDocumentClass();
      this.queueSaveSettings();
    },
    setBlur(value) {
      this.blur = Math.max(0, Math.min(24, Number(value) || 0));
      this.syncDocumentClass();
      this.queueSaveSettings();
    },
    async uploadImageFromFile(file) {
      const session = useSessionStore();
      if (!session.isLoggedIn) throw new Error('请先登录');

      const uploadFile = await processBackgroundImageFile(file);
      this.syncing = true;
      try {
        const data = await uploadUserBackground(session.userSessionId, uploadFile);
        this.applyPayload(data);
        cacheCloudPayload(data);
        return data;
      } finally {
        this.syncing = false;
      }
    },
    async clearCloudBackground() {
      const session = useSessionStore();
      if (!session.isLoggedIn) throw new Error('请先登录');

      this.syncing = true;
      try {
        const data = await clearUserBackground(session.userSessionId);
        this.applyPayload(data);
        cacheCloudPayload(data);
        return data;
      } finally {
        this.syncing = false;
      }
    },
    async hydrate() {
      clearLegacyBackgroundStorage();
      const session = useSessionStore();
      if (!session.isLoggedIn) {
        this.resetLocal();
      }
    },
  },
});
