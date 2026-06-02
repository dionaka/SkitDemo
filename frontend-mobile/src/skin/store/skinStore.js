import { defineStore } from 'pinia';
import { getUserBackground, updateUserBackground, clearUserBackground } from '@/api/background';
import { useSessionStore } from '@/stores/session';
import { parseSkinFile, cleanupParsedSkin } from '../parser/parseSkinFile';
import { prepareThemeForCloud } from '../parser/persistAssets';
import { isSkinActive } from '../parser/normalizeTheme';

const EMPTY_THEME = null;

export const useSkinStore = defineStore('bilibiliSkin', {
  state: () => ({
    theme: EMPTY_THEME,
    loading: false,
    syncing: false,
    refreshToken: 0,
  }),

  getters: {
    isActive(state) {
      return isSkinActive(state.theme);
    },
    themeName(state) {
      return state.theme?.name || '';
    },
    previewUrl(state) {
      return state.theme?.preview || '';
    },
    isBilibiliSkin() {
      return this.isActive;
    },
    themeColors(state) {
      if (!state.theme?.colors) return null;
      return state.theme.colors;
    },
    topNavTheme(state) {
      const theme = state.theme;
      if (!theme) return null;
      return {
        navBackgroundImage: theme.topNav?.backgroundImage || '',
        navBackgroundGradient: theme.topNav?.gradient || '',
        navAccentGlow: theme.colors?.accent
          ? `${theme.colors.accent}88`
          : '',
        navMeshColor: theme.topNav?.meshColor
          ? `${theme.topNav.meshColor}33`
          : '',
      };
    },
    tabBarTheme(state) {
      return state.theme?.tabBar || null;
    },
    refreshTheme(state) {
      return state.theme?.refresh || null;
    },
    pageBackgroundImage(state) {
      return state.theme?.pageBackground?.image || '';
    },
  },

  actions: {
    applyTheme(theme) {
      this.theme = theme || EMPTY_THEME;
    },

    applyPayload(data = {}) {
      if (!data.skin_data) {
        this.theme = EMPTY_THEME;
        return;
      }
      try {
        const parsed = typeof data.skin_data === 'string'
          ? JSON.parse(data.skin_data)
          : data.skin_data;
        this.applyTheme(parsed);
      } catch {
        this.theme = EMPTY_THEME;
      }
    },

    async fetchFromCloud() {
      const session = useSessionStore();
      if (!session.isLoggedIn) {
        this.theme = EMPTY_THEME;
        return null;
      }

      this.loading = true;
      try {
        const data = await getUserBackground(session.userSessionId);
        this.applyPayload(data);
        return data;
      } catch {
        this.theme = EMPTY_THEME;
        return null;
      } finally {
        this.loading = false;
      }
    },

    async saveToCloud() {
      const session = useSessionStore();
      if (!session.isLoggedIn) throw new Error('请先登录');
      if (!this.theme) throw new Error('没有可保存的主题');

      this.syncing = true;
      try {
        const data = await updateUserBackground(session.userSessionId, {
          skin_data: JSON.stringify(this.theme),
        });
        this.applyPayload(data);
        return data;
      } finally {
        this.syncing = false;
      }
    },

    async importFromFile(file) {
      const session = useSessionStore();
      if (!session.isLoggedIn) throw new Error('请先登录');

      let parsed;
      this.syncing = true;
      try {
        parsed = await parseSkinFile(file);
        this.applyTheme(parsed.theme);
        const forCloud = await prepareThemeForCloud(parsed.theme);
        this.applyTheme(forCloud);
        await this.saveToCloud();
        return forCloud;
      } finally {
        cleanupParsedSkin(parsed);
        this.syncing = false;
      }
    },

    async clearSkin() {
      const session = useSessionStore();
      if (!session.isLoggedIn) throw new Error('请先登录');

      this.syncing = true;
      try {
        const data = await clearUserBackground(session.userSessionId);
        this.theme = EMPTY_THEME;
        return data;
      } finally {
        this.syncing = false;
      }
    },

    triggerHomeRefresh() {
      this.refreshToken += 1;
    },

    async hydrate() {
      await this.fetchFromCloud();
    },
  },
});
