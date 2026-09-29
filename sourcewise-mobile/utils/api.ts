import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Node.js API runs on port 4000, Python AI service on port 8000.
// Configurable via EXPO_PUBLIC_API_URL / EXPO_PUBLIC_AI_URL (see .env.example).
// NOTE: plain `localhost` only reaches a dev server from web/emulator builds —
// on a physical device set these to your machine's LAN IP (e.g. http://192.168.1.10:4000).
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
export const AI_URL = process.env.EXPO_PUBLIC_AI_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add auth token interceptor
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
    }
    return Promise.reject(error);
  }
);
