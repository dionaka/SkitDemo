import axios from 'axios';
import { getApiBaseUrl } from '@/config/server';

const request = axios.create({
  timeout: 60000,
});

request.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

request.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code !== 0) {
      const error = new Error(message || '请求失败');
      error.status = res.status;
      return Promise.reject(error);
    }
    return data;
  },
  (err) => {
    const message = err.response?.data?.message || err.message || '网络错误';
    const error = new Error(message);
    error.status = err.response?.status ?? null;
    error.isNetworkError = !err.response;
    if (!err.config?.silent) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);
export default request;
