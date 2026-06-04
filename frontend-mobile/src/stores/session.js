import { defineStore } from 'pinia';
import { getProfile } from '@/api/auth';
import { getApiBaseUrl } from '@/config/server';
import { hydrateUserCloudAsync, resetUserCloudLocal } from '@/services/userCloudSync';
import { clearAppearanceCache } from '@/services/userAppearanceCache';

function createAnonymousSessionId() {
  return `session_${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateSessionId() {
  let id = localStorage.getItem('user_session_id');
  if (!id) {
    id = createAnonymousSessionId();
    localStorage.setItem('user_session_id', id);
  }
  return id;
}

function persistUserProfile(profile) {
  if (!profile) return;
  if (profile.username) localStorage.setItem('app_username', profile.username);
  else localStorage.removeItem('app_username');
  if (profile.user_id != null) localStorage.setItem('app_user_id', String(profile.user_id));
  else localStorage.removeItem('app_user_id');
  if (profile.avatar_url) localStorage.setItem('app_avatar_url', profile.avatar_url);
  else localStorage.removeItem('app_avatar_url');
  if (profile.user_session_id) {
    localStorage.setItem('user_session_id', profile.user_session_id);
  }
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    userSessionId: getOrCreateSessionId(),
    username: localStorage.getItem('app_username') || '',
    userId: Number(localStorage.getItem('app_user_id') || 0) || null,
    avatarUrl: localStorage.getItem('app_avatar_url') || '',
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.username),
    isAnonymousSession: (state) => state.userSessionId.startsWith('session_'),
  },
  actions: {
    applyProfile(profile) {
      this.username = profile.username || '';
      this.userId = profile.user_id ?? null;
      this.avatarUrl = profile.avatar_url || '';
      if (profile.user_session_id) this.userSessionId = profile.user_session_id;
      persistUserProfile(profile);
    },
    setUser(profile) {
      this.applyProfile(profile);
      hydrateUserCloudAsync().catch(() => {});
    },
    updateAvatar(avatarUrl) {
      this.avatarUrl = avatarUrl || '';
      if (avatarUrl) localStorage.setItem('app_avatar_url', avatarUrl);
      else localStorage.removeItem('app_avatar_url');
    },
    logout() {
      const previousUserId = this.userId;
      this.username = '';
      this.userId = null;
      this.avatarUrl = '';
      localStorage.removeItem('app_username');
      localStorage.removeItem('app_user_id');
      localStorage.removeItem('app_avatar_url');
      if (previousUserId) clearAppearanceCache(previousUserId);
      const nextId = createAnonymousSessionId();
      this.userSessionId = nextId;
      localStorage.setItem('user_session_id', nextId);
      resetUserCloudLocal();
    },
    async restoreSession() {
      if (!this.isLoggedIn || !getApiBaseUrl()) return;

      try {
        const data = await getProfile(this.userSessionId);
        this.applyProfile(data);
      } catch (err) {
        // 仅服务端明确拒绝 session 时登出；断网/超时保留本地登录态
        if (err?.status === 401 || err?.status === 403) {
          this.logout();
        }
      }
    },
  },
});
