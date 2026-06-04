import request from './request';

export const getVideoComments = (videoId, { userSessionId, page = 1, size = 20 } = {}) =>
  request.get(`/api/v1/videos/${videoId}/comments`, {
    params: {
      user_session_id: userSessionId || undefined,
      page,
      size,
    },
    silent: true,
  });

export const postVideoComment = (videoId, userSessionId, content) =>
  request.post(`/api/v1/videos/${videoId}/comments`, {
    user_session_id: userSessionId,
    content,
  }, { silent: true });

export const deleteVideoComment = (commentId, userSessionId) =>
  request.delete(`/api/v1/comments/${commentId}`, {
    data: { user_session_id: userSessionId },
    silent: true,
  });
