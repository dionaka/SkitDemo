import { defineStore } from 'pinia';

function getOrCreateSessionId() {
  let id = localStorage.getItem('user_session_id');
  if (!id) {
    id = 'session_' + Math.random().toString(36).slice(2, 12);
    localStorage.setItem('user_session_id', id);
  }
  return id;
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    userSessionId: getOrCreateSessionId(),
    adminToken: localStorage.getItem('admin_token') || '',
    adminUsername: localStorage.getItem('admin_username') || '',
  }),
  actions: {
    setAdmin(token, username) {
      this.adminToken = token;
      this.adminUsername = username;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_username', username);
    },
    logout() {
      this.adminToken = '';
      this.adminUsername = '';
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
    },
  },
});
