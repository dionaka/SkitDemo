import request from '@/api/request';

export function getBranchPointDetail(id) {
  return request.get(`/api/v1/branch/branch-points/${id}`);
}

export function chooseBranchPoint(id, payload) {
  return request.post(`/api/v1/branch/branch-points/${id}/choose`, payload);
}

export function getBranchPointStats(id) {
  return request.get(`/api/v1/branch/branch-points/${id}/stats`, { silent: true });
}

export function getAdminBranchPoints(videoId) {
  return request.get(`/api/admin/branch/videos/${videoId}/branch-points`);
}

export function analyzeVideoBranches(videoId, body = {}) {
  return request.post(`/api/admin/branch/videos/${videoId}/branch-points/analyze`, body);
}

export function createBranchPoint(data) {
  return request.post('/api/admin/branch/branch-points', data);
}

export function updateBranchPoint(id, data) {
  return request.put(`/api/admin/branch/branch-points/${id}`, data);
}

export function deleteBranchPoint(id) {
  return request.delete(`/api/admin/branch/branch-points/${id}`);
}

export function updateBranchChoice(choiceId, data) {
  return request.put(`/api/admin/branch/branch-choices/${choiceId}`, data);
}

export function prewarmVideoBranches(videoId) {
  return request.post(`/api/admin/branch/videos/${videoId}/branch-points/prewarm`);
}

export function getBranchGenerationOptions() {
  return request.get('/api/admin/branch/generation-options');
}
