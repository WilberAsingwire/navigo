import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('navigo_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('navigo_token');
      if (token) {
        // Preserve onboarding key, clear only auth
        const onboarding = localStorage.getItem('navigo_onboarding_complete');
        localStorage.removeItem('navigo_token');
        localStorage.removeItem('navigo_user');
        localStorage.removeItem('navigo_guest');
        if (onboarding) localStorage.setItem('navigo_onboarding_complete', onboarding);
        // Avoid redirect loop if already on login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
