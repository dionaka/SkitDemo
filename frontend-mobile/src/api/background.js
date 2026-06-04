import request from './request';

let inflightFetch = null;

export const getUserBackground = (userSessionId) =>
  request.get('/api/v1/user/background', {
    params: { user_session_id: userSessionId },
    silent: true,
  });

/** 合并请求：同一时刻只发一次 background 拉取 */
export function getUserBackgroundOnce(userSessionId) {
  if (!userSessionId) return Promise.resolve(null);
  if (!inflightFetch) {
    inflightFetch = getUserBackground(userSessionId).finally(() => {
      inflightFetch = null;
    });
  }
  return inflightFetch;
}

export const updateUserBackground = (userSessionId, payload) =>
  request.put('/api/v1/user/background', {
    user_session_id: userSessionId,
    ...payload,
  }, { silent: true });

export const uploadUserBackground = (userSessionId, file) => {
  const formData = new FormData();
  formData.append('background_file', file);
  formData.append('user_session_id', userSessionId);
  return request.post('/api/v1/user/background/image', formData, { silent: true });
};

export const clearUserBackground = (userSessionId) =>
  request.delete('/api/v1/user/background', {
    data: { user_session_id: userSessionId },
    silent: true,
  });
