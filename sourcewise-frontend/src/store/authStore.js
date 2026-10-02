import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSourceStore } from './sourceStore';
import { useWorkspaceStore } from './workspaceStore';
import { useChatStore } from './chatStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (userData, token) => {
        // Clear all un-scoped legacy keys that caused cross-user leakage
        try {
          localStorage.removeItem('sourcewise-sources');
          localStorage.removeItem('sourcewise_workspace_storage');
          localStorage.removeItem('sourcewise-chat');
          localStorage.removeItem('sourcewise_student_events');
          localStorage.removeItem('sourcewise_student_events_guest');
          localStorage.removeItem('sw_timer_left');
          localStorage.removeItem('sw_focus_mins');
          localStorage.removeItem('sw_focus_date');
        } catch (_) {}

        const uid = userData?.id;

        // Reset and initialize all stores for this incoming user
        try {
          useSourceStore.getState().initForUser(uid);
          useWorkspaceStore.getState().initForUser(uid);
          useChatStore.getState().initForUser(uid);
        } catch (_) {}

        set({ user: userData, accessToken: token, isAuthenticated: true });
      },

      logout: () => {
        try {
          localStorage.removeItem('sourcewise-sources');
          localStorage.removeItem('sourcewise_workspace_storage');
          localStorage.removeItem('sourcewise-chat');
          localStorage.removeItem('sourcewise_student_events');
          localStorage.removeItem('sourcewise_student_events_guest');
          localStorage.removeItem('sw_timer_left');
          localStorage.removeItem('sw_focus_mins');
          localStorage.removeItem('sw_focus_date');
        } catch (_) {}

        // Reset all in-memory stores completely
        try {
          useSourceStore.getState().clearSources();
          useWorkspaceStore.getState().resetWorkspace();
          useChatStore.getState().resetChat();
        } catch (_) {}

        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      hydrateFromToken: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          try {
            useSourceStore.getState().clearSources();
            useWorkspaceStore.getState().resetWorkspace();
            useChatStore.getState().resetChat();
          } catch (_) {}
          set({ _hasHydrated: true });
          return;
        }
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            const uid = data.user?.id;
            try {
              useSourceStore.getState().initForUser(uid);
              useWorkspaceStore.getState().initForUser(uid);
              useChatStore.getState().initForUser(uid);
            } catch (_) {}
            set({ user: data.user, isAuthenticated: true, _hasHydrated: true });
          } else {
            // Token is invalid/expired — clear it
            try {
              useSourceStore.getState().clearSources();
              useWorkspaceStore.getState().resetWorkspace();
              useChatStore.getState().resetChat();
            } catch (_) {}
            set({ user: null, accessToken: null, isAuthenticated: false, _hasHydrated: true });
          }
        } catch {
          // Network error — keep persisted state and initialize stores with cached user
          const currentUser = get().user;
          if (currentUser?.id) {
            try {
              useSourceStore.getState().initForUser(currentUser.id);
              useWorkspaceStore.getState().initForUser(currentUser.id);
              useChatStore.getState().initForUser(currentUser.id);
            } catch (_) {}
          }
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
