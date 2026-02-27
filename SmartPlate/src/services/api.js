import axios from 'axios';
import { getToken, setToken, deleteToken } from './tokenStorage';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
  },
});

// Request interceptor: attach access token to every request
api.interceptors.request.use(
  async (config) => {
    const accessToken = await getToken('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 by refreshing the token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/api/token/refresh/') ||
        originalRequest.url?.includes('/api/token/')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getToken('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(
          `${API_BASE_URL}/api/token/refresh/`,
          { refresh: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': '69420',
            },
          }
        );

        const { access, refresh } = response.data;
        await setToken('accessToken', access);
        if (refresh) await setToken('refreshToken', refresh);

        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await deleteToken('accessToken');
        await deleteToken('refreshToken');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Scanner ───────────────────────────────────────────────────────────────────
export const scanFood = (imageBase64, mimeType = 'image/jpeg') =>
  api.post('/api/scan/', { image_base64: imageBase64, mime_type: mimeType });

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = () => api.get('/api/planner/profile/');
export const saveProfile = (data) => api.post('/api/planner/profile/', data);

// ── Daily Stats ───────────────────────────────────────────────────────────────
export const getDailyStats = (date) =>
  api.get('/api/planner/stats/', { params: date ? { date } : {} });

// ── Favorites ─────────────────────────────────────────────────────────────────
export const getFavorites = (meal_type) =>
  api.get('/api/planner/favorites/', { params: meal_type ? { meal_type } : {} });

export const addFavorite = (data) => api.post('/api/planner/favorites/', data);
export const removeFavorite = (id) => api.delete(`/api/planner/favorites/${id}/`);

// ── Weekly Meal Plan ──────────────────────────────────────────────────────────
export const getWeekPlan = (start) =>
  api.get('/api/planner/plan/week/', { params: start ? { start } : {} });

export const generateWeekPlan = (start, rating) => {
  const body = {};
  if (start) body.start = start;
  if (rating) body.rating = rating;
  return api.post('/api/planner/plan/week/generate/', body);
};

export const regenerateSlot = (date, slot) =>
  api.post(`/api/planner/plan/${date}/slot/`, { slot });

// ── Food Log ──────────────────────────────────────────────────────────────────
export const getFoodLog = (date) =>
  api.get('/api/planner/log/', { params: date ? { date } : {} });

export const logMeal = (data) => api.post('/api/planner/log/', data);
export const deleteFoodLog = (id) => api.delete(`/api/planner/log/${id}/`);

// ── Weight Log ────────────────────────────────────────────────────────────────
export const getWeightLogs = () => api.get('/api/planner/weight/');
export const logWeight = (data) => api.post('/api/planner/weight/', data);

// ── Weekly Check-in ───────────────────────────────────────────────────────────
export const getLatestCheckIn = () => api.get('/api/planner/checkin/');
export const submitCheckIn = (data) => api.post('/api/planner/checkin/', data);

// ── Progress ──────────────────────────────────────────────────────────────────
export const getProgress = () => api.get('/api/planner/progress/');

// ── Meal Image ────────────────────────────────────────────────────────────────
export const getMealImage = (q) =>
  api.get('/api/planner/meal-image/', { params: { q } });

// ── Chef Generation History ───────────────────────────────────────────────────
export const getChefHistory = () => api.get('/api/chef/history/');
export const getChefDish = (id) => api.get(`/api/chef/history/${id}/`);
export const deleteChefDish = (id) => api.delete(`/api/chef/history/${id}/`);

export default api;
