import request from './request';

export const recordInteraction = (data) => request.post('/api/v1/interactions', data);

export const getInteractionStats = (highlightId) =>
  request.get(`/api/v1/interactions/stats/${highlightId}`);
