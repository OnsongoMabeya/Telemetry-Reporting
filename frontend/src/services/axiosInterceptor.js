import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Create custom axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL
});

let authContextLogout = null;
let authContextRefreshToken = null;

export const setAuthLogout = (logoutFunction) => {
  authContextLogout = logoutFunction;
};

export const setAuthRefreshToken = (refreshFunction) => {
  authContextRefreshToken = refreshFunction;
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip interceptor for the refresh request itself to prevent recursion
    if (originalRequest._skipAuthRefresh) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;

      if (errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        // Try to refresh the token via keep-alive before logging out
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          console.log('[Interceptor] Attempting token refresh via keep-alive...');
          const response = await apiClient.get('/api/keep-alive', {
            _skipAuthRefresh: true
          });
          console.log('[Interceptor] Keep-alive response:', response.data);
          if (response.data.token) {
            console.log('[Interceptor] Token refreshed successfully');
            localStorage.setItem('token', response.data.token);
            if (authContextRefreshToken) {
              authContextRefreshToken(response.data.token);
            }
            processQueue(null, response.data.token);
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.log('[Interceptor] Keep-alive refresh failed:', refreshError.response?.data || refreshError.message);
          processQueue(refreshError, null);
          // Don't logout here - let the error propagate and handle in the else block below
        } finally {
          isRefreshing = false;
        }

        // Only logout if we reach here without returning above
        console.log('[Interceptor] Refresh failed, forcing logout');
        localStorage.removeItem('token');
        if (authContextLogout) {
          authContextLogout();
        }
      } else if (errorCode === 'INVALID_TOKEN' || errorCode === 'NO_TOKEN') {
        localStorage.removeItem('token');
        if (authContextLogout) {
          authContextLogout();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
