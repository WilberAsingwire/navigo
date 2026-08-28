import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  // Never let a slow/dead backend hang the app — fail fast and let the UI show its error state
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('navigo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle global errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const token = localStorage.getItem('navigo_token');
      if (token) {
        // Only logout and redirect if the user actually had a token that is now invalid
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }

);

export default api;
