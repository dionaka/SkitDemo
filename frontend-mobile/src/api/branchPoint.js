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
