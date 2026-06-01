import { defineStore } from 'pinia';

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

export const useSessionStore = defineStore('session', {
  state: () => ({
    userSessionId: getOrCreateSessionId(),
    username: localStorage.getItem('app_username') || '',
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.username),
  },
  actions: {
    setUser({ username, user_session_id: sessionId }) {
      this.username = username;
      if (sessionId) {
        this.userSessionId = sessionId;
        localStorage.setItem('user_session_id', sessionId);
      }
      localStorage.setItem('app_username', username);
    },
    logout() {
      this.username = '';
      localStorage.removeItem('app_username');
      const nextId = createAnonymousSessionId();
      this.userSessionId = nextId;
      localStorage.setItem('user_session_id', nextId);
    },
  },
});
