import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
let token = null;

try {
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token");
  }
} catch (err) {
  console.error("localStorage blocked in interceptor");
}
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me')
};

// Hives API
export const hivesAPI = {
  // Get all hives (admin sees all, farmer sees owned)
  getAllHives: () => api.get('/hives'),
  
  // Get latest sensor data for a specific hive
  getLatestData: (hiveId) => api.get(`/hives/data/${hiveId}/latest`),
  
  // Get historical data
  getHistory: (hiveId, params = {}) => api.get(`/hives/data/${hiveId}/history`, { params }),
  
  // Create new hive (admin only)
  createHive: (hiveData) => api.post('/hives', hiveData),
  
  // Update hive settings
  updateHive: (hiveId, updates) => api.put(`/hives/${hiveId}`, updates),
  
  // Delete hive (admin only)
  deleteHive: (hiveId) => api.delete(`/hives/${hiveId}`)
};

export default api;
