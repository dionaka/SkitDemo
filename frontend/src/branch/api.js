import request from '@/api/request';

export function getBranchDemos() {
  return request.get('/api/v1/branch/demos');
}

export function getBranchDemo(id) {
  return request.get(`/api/v1/branch/demos/${id}`);
}

export function getBranchNode(id) {
  return request.get(`/api/v1/branch/nodes/${id}`);
}

export function chooseBranch(demoId, payload) {
  return request.post(`/api/v1/branch/demos/${demoId}/choose`, payload);
}

export function getBranchStats(demoId) {
  return request.get(`/api/v1/branch/demos/${demoId}/stats`, { silent: true });
}

export function getBranchGenerators() {
  return request.get('/api/v1/branch/generators', { silent: true });
}

// —— 管理端 ——
export function getAdminBranchDemos() {
  return request.get('/api/admin/branch/demos');
}

export function getAdminBranchTree(demoId) {
  return request.get(`/api/admin/branch/demos/${demoId}`);
}

export function getTtsProviders() {
  return request.get('/api/admin/branch/tts/providers');
}

export function updateBranchNode(nodeId, payload) {
  return request.put(`/api/admin/branch/nodes/${nodeId}`, payload);
}

export function uploadBranchNodeAssets(nodeId, formData) {
  return request.post(`/api/admin/branch/nodes/${nodeId}/assets`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function prewarmBranchDemo(demoId) {
  return request.post(`/api/admin/branch/demos/${demoId}/prewarm`);
}
