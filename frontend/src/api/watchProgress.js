import request from './request';

export const getWatchProgress = (videoId, userSessionId) =>
  request.get(`/api/v1/watch-progress/${videoId}`, {
    params: { user_session_id: userSessionId },
    silent: true,
  });

export const saveWatchProgress = (videoId, data) =>
  request.put(`/api/v1/watch-progress/${videoId}`, data, { silent: true });

export const getContinueWatching = (userSessionId) =>
  request.get('/api/v1/watch-progress/continue', {
    params: { user_session_id: userSessionId },
    silent: true,
  });
