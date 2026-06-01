import request from '@/api/request';

export function getBranchDemos() {
  return request.get('/api/v1/branch/demos');
}

export function getBranchDemo(id) {
  return request.get(`/api/v1/branch/demos/${id}`);
}

export function chooseBranch(demoId, payload) {
  return request.post(`/api/v1/branch/demos/${demoId}/choose`, payload);
}

export function getBranchStats(demoId) {
  return request.get(`/api/v1/branch/demos/${demoId}/stats`, { silent: true });
}
