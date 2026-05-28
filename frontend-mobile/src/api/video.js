import request from './request';

export const getVideoList = (page = 1, size = 10) =>
  request.get('/api/v1/videos', { params: { page, size } });

export const getVideoDetail = (id) => request.get(`/api/v1/videos/${id}`);
