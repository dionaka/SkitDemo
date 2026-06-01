import request from './request';

export const login = (data) => request.post('/api/v1/auth/login', data, { silent: true });

export const register = (data) => request.post('/api/v1/auth/register', data, { silent: true });
