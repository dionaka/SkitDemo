import request from './request';

export const getVideoList = (page = 1, size = 10) =>
  request.get('/api/v1/videos', { params: { page, size } });

export const getVideoDetail = (id) => request.get(`/api/v1/videos/${id}`);

export const syncVideoDuration = (id, durationSeconds) =>
  request.post(`/api/v1/videos/${id}/duration`, { duration_seconds: durationSeconds }, { silent: true });
