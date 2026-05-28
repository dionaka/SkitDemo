import { defineStore } from 'pinia';

function getOrCreateSessionId() {
  let id = localStorage.getItem('user_session_id');
  if (!id) {
    id = `session_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem('user_session_id', id);
  }
  return id;
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    userSessionId: getOrCreateSessionId(),
  }),
});
