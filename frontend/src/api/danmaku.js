import request from './request';

export const listDanmaku = (videoId, params) =>
  request.get(`/api/v1/videos/${videoId}/danmaku`, { params });

export const sendDanmaku = (videoId, data) =>
  request.post(`/api/v1/videos/${videoId}/danmaku`, data);

export const deleteDanmaku = (id, userSessionId) =>
  request.delete(`/api/v1/danmaku/${id}`, { data: { user_session_id: userSessionId } });
