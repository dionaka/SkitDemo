import request from './request';

export const adminLogin = (data) => request.post('/api/admin/login', data);

export const getAdminVideos = () => request.get('/api/admin/videos');

export const getAdminSeries = () => request.get('/api/admin/series');

export const uploadVideo = (formData) =>
  request.post('/api/admin/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const publishVideo = (id) => request.put(`/api/admin/videos/${id}/publish`);

export const updateVideo = (id, data) => request.put(`/api/admin/videos/${id}`, data);

export const deleteVideo = (id) => request.delete(`/api/admin/videos/${id}`);

export const analyzeVideo = (id) => request.post(`/api/admin/videos/${id}/analyze`);

export const getHighlights = (videoId) =>
  request.get('/api/admin/highlights', { params: { video_id: videoId } });

export const createHighlight = (data) => request.post('/api/admin/highlights', data);

export const updateHighlight = (id, data) => request.put(`/api/admin/highlights/${id}`, data);

export const deleteHighlight = (id) => request.delete(`/api/admin/highlights/${id}`);

export const getAiSettings = () => request.get('/api/admin/settings/ai');

export const saveAiSettings = (data) => request.put('/api/admin/settings/ai', data);

export const testAiSettings = (data) => request.post('/api/admin/settings/ai/test', data);

export const deleteAiSettings = () => request.delete('/api/admin/settings/ai');
