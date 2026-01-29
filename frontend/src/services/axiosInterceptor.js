import axios from 'axios';
import { API_BASE_URL } from '../config/api';

let authContextLogout = null;

export const setAuthLogout = (logoutFunction) => {
  authContextLogout = logoutFunction;
};

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token && config.url?.startsWith(API_BASE_URL)) {
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
  (error) => {
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'NO_TOKEN') {
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
