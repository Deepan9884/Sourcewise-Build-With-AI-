import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,

  setToken: (token: string) => {
    set({ token, isAuthenticated: true });
  },

  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store token in AsyncStorage
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));

      set({
        isAuthenticated: true,
        user: data.user,
        token: data.token,
      });

      return { success: true };
    } catch (error) {
      console.error('[AuthStore] Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  register: async (email, password, name) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // Store token in AsyncStorage
      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));

      set({
        isAuthenticated: true,
        user: data.user,
        token: data.token,
      });

      return { success: true };
    } catch (error) {
      console.error('[AuthStore] Register error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  },

  restoreToken: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('auth_token');
      const userJson = await AsyncStorage.getItem('auth_user');

      if (token && userJson) {
        const user = JSON.parse(userJson);

        // Verify token is still valid
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          set({
            isAuthenticated: true,
            user: user,
            token: token,
            isLoading: false,
          });
          return;
        }
      }

      // Token invalid or missing
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      set({ isLoading: false });
    } catch (error) {
      console.error('[AuthStore] Restore token error:', error);
      set({ isLoading: false });
    }
  },
}));
