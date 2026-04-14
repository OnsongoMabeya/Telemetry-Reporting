import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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

axios.interceptors.request.use(
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

axios.interceptors.response.use(
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
            return axios(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const response = await axios.get(`${API_BASE_URL}/api/keep-alive`, {
            _skipAuthRefresh: true
          });
          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            if (authContextRefreshToken) {
              authContextRefreshToken(response.data.token);
            }
            processQueue(null, response.data.token);
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return axios(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
        } finally {
          isRefreshing = false;
        }

        // Refresh failed — force logout
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

export default axios;
