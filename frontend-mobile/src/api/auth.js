import request from './request';

export const login = (data) => request.post('/api/v1/auth/login', data, { silent: true });

export const register = (data) => request.post('/api/v1/auth/register', data, { silent: true });

export const getProfile = (userSessionId) =>
  request.get('/api/v1/auth/me', { params: { user_session_id: userSessionId }, silent: true });

export const uploadAvatar = (userSessionId, file) => {
  const formData = new FormData();
  formData.append('avatar_file', file);
  formData.append('user_session_id', userSessionId);
  return request.post('/api/v1/auth/avatar', formData, { silent: true });
};
