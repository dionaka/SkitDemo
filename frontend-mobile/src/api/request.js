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
      return Promise.reject(new Error(message || '请求失败'));
    }
    return data;
  },
  (err) => {
    const message = err.response?.data?.message || err.message || '网络错误';
    return Promise.reject(new Error(message));
  }
);

export default request;
