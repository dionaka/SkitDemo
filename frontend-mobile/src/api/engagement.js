import request from './request';

export const getSeriesEngagement = (seriesId, userSessionId) =>
  request.get(`/api/v1/series/${seriesId}/engagement`, {
    params: { user_session_id: userSessionId || undefined },
    silent: true,
  });

export const toggleSeriesLike = (seriesId, userSessionId) =>
  request.post(`/api/v1/series/${seriesId}/like`, { user_session_id: userSessionId }, { silent: true });

export const toggleSeriesFavorite = (seriesId, userSessionId) =>
  request.post(`/api/v1/series/${seriesId}/favorite`, { user_session_id: userSessionId }, { silent: true });

export const getFavoriteSeries = (userSessionId) =>
  request.get('/api/v1/user/favorites', {
    params: { user_session_id: userSessionId },
    silent: true,
  });
