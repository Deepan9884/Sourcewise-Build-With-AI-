import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app';

// Generate a user-scoped localStorage key so different users never share data
function scopedKey(userId) {
  return userId ? `sourcewise-sources-${userId}` : 'sourcewise-sources-guest';
}

function getInitialSourcesData() {
  try {
    const rawAuth = localStorage.getItem('sourcewise-auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      const userId = parsed?.state?.user?.id;
      if (userId) {
        const raw = localStorage.getItem(scopedKey(userId));
        if (raw) {
          const parsedSources = JSON.parse(raw);
          return {
            userId,
            uploadedSources: parsedSources.uploadedSources || [],
            activeSourceIds: parsedSources.activeSourceIds || [],
          };
        }
        return { userId, uploadedSources: [], activeSourceIds: [] };
      }
    }
  } catch (_) {}
  return { userId: null, uploadedSources: [], activeSourceIds: [] };
}

const initial = getInitialSourcesData();

export const useSourceStore = create(
  (set, get) => ({
    uploadedSources: initial.uploadedSources,
    activeSourceIds: initial.activeSourceIds,
    isLoading: false,
    error: null,
    _userId: initial.userId,

    // Called on login — loads persisted data for this user, clears any previous user's data
    initForUser: (userId) => {
      // Wipe current in-memory state first (prevents previous user's data showing briefly)
      set({ uploadedSources: [], activeSourceIds: [], _userId: userId });
      // Load this user's persisted sources from their scoped key
      try {
        const raw = localStorage.getItem(scopedKey(userId));
        if (raw) {
          const parsed = JSON.parse(raw);
          set({
            uploadedSources: parsed.uploadedSources || [],
            activeSourceIds: parsed.activeSourceIds || [],
          });
        }
      } catch (_) {}
    },

    // Persist current state to this user's scoped key
    _persist: () => {
      const { uploadedSources, activeSourceIds, _userId } = get();
      try {
        localStorage.setItem(scopedKey(_userId), JSON.stringify({ uploadedSources, activeSourceIds }));
      } catch (_) {}
    },

    addSource: (source) => {
      set((state) => {
        const filtered = state.uploadedSources.filter((s) => s.id !== source.id && s.name !== source.name);
        const nextSources = [source, ...filtered];
        const nextActive = state.activeSourceIds.includes(source.id)
          ? state.activeSourceIds
          : [source.id, ...state.activeSourceIds];
        return { uploadedSources: nextSources, activeSourceIds: nextActive };
      });
      get()._persist();
    },

    removeSource: (id) => {
      set((state) => ({
        uploadedSources: state.uploadedSources.filter(s => s.id !== id),
        activeSourceIds: state.activeSourceIds.filter(sId => sId !== id)
      }));
      get()._persist();
    },

    toggleActiveSource: (id) => {
      set((state) => ({
        activeSourceIds: state.activeSourceIds.includes(id)
          ? state.activeSourceIds.filter(sId => sId !== id)
          : [...state.activeSourceIds, id]
      }));
      get()._persist();
    },

    setActiveSources: (ids) => {
      set({ activeSourceIds: ids });
      get()._persist();
    },

    updateSourceStatus: (id, status) => {
      set((state) => ({
        uploadedSources: state.uploadedSources.map(s => s.id === id ? { ...s, status } : s)
      }));
      get()._persist();
    },

    updateSourceChunks: (id, chunksIndexed) => {
      set((state) => ({
        uploadedSources: state.uploadedSources.map(s => s.id === id ? { ...s, chunksIndexed } : s)
      }));
      get()._persist();
    },

    clearSources: () => {
      set({ uploadedSources: [], activeSourceIds: [] });
      // Also wipe guest key to be safe
      try { localStorage.removeItem('sourcewise-sources-guest'); } catch (_) {}
      // Note: user-scoped key is NOT cleared on logout — data remains for next login
    },

    fetchSources: async (accessToken) => {
      if (!accessToken) return;
      set({ isLoading: true });
      try {
        const res = await fetch(`${API_URL}/sources`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.sources || data.data || []);
          const formatted = list
            .filter(s => (s.type || '').toLowerCase() !== 'note')
            .map((s) => ({
              id: s.id,
              name: s.name || s.title || 'Untitled Document',
              title: s.title || s.name || 'Untitled Document',
              size: s.size || 0,
              type: s.type || 'pdf',
              status: s.status || 'ready',
              chunksIndexed: s.chunks_count ?? s.chunks_indexed ?? s.chunksIndexed ?? 0,
              chunksCount: s.chunks_count ?? s.chunks_indexed ?? 0,
              createdAt: s.created_at,
              summary: s.summary,
              concepts: s.concepts,
              analysis: s.analysis,
            }));

          set((state) => {
            const backendIds = new Set(formatted.map((s) => s.id));
            const backendNames = new Set(formatted.map((s) => (s.name || '').toLowerCase().trim()));

            // Keep locally-added sources that backend doesn't know about yet (uploading/processing)
            const localRetained = (state.uploadedSources || []).filter((s) => {
              if (backendIds.has(s.id)) return false;
              const normName = (s.name || '').toLowerCase().trim();
              if (normName && backendNames.has(normName)) return false;
              if (typeof s.id === 'string' && (s.id.startsWith('demo-') || s.id.startsWith('src-demo-'))) return false;
              return true;
            });

            const combined = [...formatted, ...localRetained];

            const validIds = (state.activeSourceIds || []).filter((id) => combined.some((s) => s.id === id));
            const nextActive = validIds.length > 0
              ? validIds
              : (combined.length > 0 ? combined.slice(0, 3).map((s) => s.id) : []);

            return {
              uploadedSources: combined,
              activeSourceIds: nextActive,
              isLoading: false,
              error: null,
            };
          });
          // Persist after fetch
          get()._persist();
        } else {
          set({ isLoading: false });
        }
      } catch (err) {
        set({ isLoading: false, error: err.message });
      }
    },
  })
);


