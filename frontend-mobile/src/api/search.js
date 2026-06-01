import request from './request';

export const searchContent = (keyword, page = 1, size = 30) =>
  request.get('/api/v1/search', { params: { q: keyword, page, size } });
