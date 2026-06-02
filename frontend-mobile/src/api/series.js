import request from './request';

export const getSeriesList = (page = 1, size = 20, sort = 'hot', userSessionId) =>
  request.get('/api/v1/series', {
    params: {
      page,
      size,
      sort,
      ...(userSessionId ? { user_session_id: userSessionId } : {}),
    },
  });

export const getSeriesEpisodes = (seriesId, userSessionId) =>
  request.get(`/api/v1/series/${seriesId}/episodes`, {
    params: { user_session_id: userSessionId },
  });
