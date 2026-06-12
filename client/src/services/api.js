import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error('VITE_API_URL is required');
}

export const refreshClient = axios.create({
  baseURL,
  withCredentials: true
});

export const api = axios.create({
  baseURL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    const isAuthRequest = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRequest) {
      original._retry = true;

      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        useAuthStore.getState().clearSession();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export const refreshAccessToken = async () => {
  const response = await refreshClient.post('/auth/refresh');
  const token = response.data.accessToken;
  useAuthStore.getState().setSession(token);
  return token;
};

export const downloadBlob = async (url, filename) => {
  const response = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
};
