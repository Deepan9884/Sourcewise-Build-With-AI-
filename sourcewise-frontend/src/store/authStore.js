import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (userData, token) => {
        const isDemo = userData?.email?.toLowerCase().trim() === 'demo@gmail.com';
        if (!isDemo) {
          try {
            localStorage.removeItem('sourcewise-sources');
            localStorage.removeItem('sourcewise_student_events');
            localStorage.removeItem('sourcewise_student_events_guest');
            localStorage.removeItem('sw_timer_left');
            localStorage.removeItem('sw_focus_mins');
            localStorage.removeItem('sw_focus_date');
          } catch (_) {}
        }
        set({ user: userData, accessToken: token, isAuthenticated: true });
      },

      logout: () => {
        try {
          localStorage.removeItem('sourcewise-sources');
          localStorage.removeItem('sourcewise_student_events');
          localStorage.removeItem('sourcewise_student_events_guest');
          localStorage.removeItem('sw_timer_left');
          localStorage.removeItem('sw_focus_mins');
          localStorage.removeItem('sw_focus_date');
        } catch (_) {}
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      hydrateFromToken: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ _hasHydrated: true });
          return;
        }
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ user: data.user, isAuthenticated: true, _hasHydrated: true });
          } else {
            // Token is invalid/expired — clear it
            set({ user: null, accessToken: null, isAuthenticated: false, _hasHydrated: true });
          }
        } catch {
          // Network error — keep the persisted state so the user isn't logged out offline
          set({ _hasHydrated: true });
        }
      },
    }),
    {
      name: 'sourcewise-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    }
  )
);
