import request from './request';

export const adminLogin = (data, config) => request.post('/api/admin/login', data, config);

export const getAdminVideos = () => request.get('/api/admin/videos');

export const getAdminSeries = () => request.get('/api/admin/series');

export const uploadVideo = (formData) =>
  request.post('/api/admin/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const resolveVideoLink = (data) =>
  request.post('/api/admin/videos/resolve-link', data, { silent: true });

export const importVideoFromLink = (data) =>
  request.post('/api/admin/videos/import-from-link', data, { timeout: 600000, silent: true });

export const publishVideo = (id) => request.put(`/api/admin/videos/${id}/publish`);

export const updateVideo = (id, data) => request.put(`/api/admin/videos/${id}`, data);

export const deleteVideo = (id) => request.delete(`/api/admin/videos/${id}`);

export const uploadVideoCover = (id, formData) =>
  request.put(`/api/admin/videos/${id}/cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const regenerateVideoCover = (id, data = {}) =>
  request.post(`/api/admin/videos/${id}/regenerate-cover`, data);

export const analyzeVideo = (id) => request.post(`/api/admin/videos/${id}/analyze`);

export const getHighlights = (videoId) =>
  request.get('/api/admin/highlights', { params: { video_id: videoId } });

export const createHighlight = (data) => request.post('/api/admin/highlights', data);

export const updateHighlight = (id, data) => request.put(`/api/admin/highlights/${id}`, data);

export const deleteHighlight = (id) => request.delete(`/api/admin/highlights/${id}`);

export const getAiSettings = () => request.get('/api/admin/settings/ai');

export const saveAiSettings = (data) => request.put('/api/admin/settings/ai', data);

export const testAiSettings = (data) => request.post('/api/admin/settings/ai/test', data);

export const testImageSettings = (data) => request.post('/api/admin/settings/ai/test-image', data);

export const deleteAiSettings = () => request.delete('/api/admin/settings/ai');

export const getTtsSettings = () => request.get('/api/admin/settings/tts');

export const saveTtsSettings = (data) => request.put('/api/admin/settings/tts', data);

export const testTtsSettings = (data) => request.post('/api/admin/settings/tts/test', data);

export const deleteTtsSettings = () => request.delete('/api/admin/settings/tts');

export const getSiliconflowTtsSettings = () => request.get('/api/admin/settings/siliconflow-tts');

export const saveSiliconflowTtsSettings = (data) => request.put('/api/admin/settings/siliconflow-tts', data);

export const testSiliconflowTtsSettings = (data) => request.post('/api/admin/settings/siliconflow-tts/test', data);

export const deleteSiliconflowTtsSettings = () => request.delete('/api/admin/settings/siliconflow-tts');

export const getBiliCookiesSettings = () => request.get('/api/admin/settings/bili-cookies');

export const saveBiliCookiesSettings = (data) => request.put('/api/admin/settings/bili-cookies', data);

export const testBiliCookiesSettings = (data) =>
  request.post('/api/admin/settings/bili-cookies/test', data, { timeout: 120000, silent: true });

export const deleteBiliCookiesSettings = () => request.delete('/api/admin/settings/bili-cookies');
