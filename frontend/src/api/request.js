import axios from 'axios';
import { ElMessage } from 'element-plus';

const request = axios.create({
  baseURL: '',
  timeout: 60000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token && config.url?.startsWith('/api/admin')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data;
    if (code !== 0) {
      ElMessage.error(message || '请求失败');
      return Promise.reject(new Error(message));
    }
    return data;
  },
  (err) => {
    ElMessage.error(err.response?.data?.message || '网络错误');
    return Promise.reject(err);
  }
);

export default request;
