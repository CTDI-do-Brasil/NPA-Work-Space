import axios from 'axios';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:5000/api`,
  withCredentials: true, // For HttpOnly cookies
});

// REQUEST INTERCEPTOR (Add JWT to headers)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// RESPONSE INTERCEPTOR (Handle expiration and errors)
api.interceptors.response.use((response) => {
  return response;
}, async (error) => {
  const originalRequest = error.config;
  
  if (error.response.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    // Here you would normally call a refresh endpoint
    // and update the token. For this version, we redirect to login.
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }
  
  return Promise.reject(error);
});

export default api;
