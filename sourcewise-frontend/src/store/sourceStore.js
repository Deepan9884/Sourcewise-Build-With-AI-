import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || 'https://node-api-nine-flame.vercel.app';

export const useSourceStore = create(
  persist(
    (set, get) => ({
      uploadedSources: [],
      activeSourceIds: [],
      isLoading: false,
      error: null,
      
      addSource: (source) => set((state) => {
        const filtered = state.uploadedSources.filter((s) => s.id !== source.id && s.name !== source.name);
        const nextSources = [source, ...filtered];
        const nextActive = state.activeSourceIds.includes(source.id)
          ? state.activeSourceIds
          : [source.id, ...state.activeSourceIds];
        return { uploadedSources: nextSources, activeSourceIds: nextActive };
      }),
      
      removeSource: (id) => set((state) => ({
        uploadedSources: state.uploadedSources.filter(s => s.id !== id),
        activeSourceIds: state.activeSourceIds.filter(sId => sId !== id)
      })),
      
      toggleActiveSource: (id) => set((state) => ({
        activeSourceIds: state.activeSourceIds.includes(id) 
          ? state.activeSourceIds.filter(sId => sId !== id)
          : [...state.activeSourceIds, id]
      })),

      setActiveSources: (ids) => set({ activeSourceIds: ids }),
      
      updateSourceStatus: (id, status) => set((state) => ({
        uploadedSources: state.uploadedSources.map(s => s.id === id ? { ...s, status } : s)
      })),
      
      updateSourceChunks: (id, chunksIndexed) => set((state) => ({
        uploadedSources: state.uploadedSources.map(s => s.id === id ? { ...s, chunksIndexed } : s)
      })),

      clearSources: () => set({ uploadedSources: [], activeSourceIds: [] }),

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

              // Retain local uploaded documents defensively (whether uploading, processing, or ready)
              // so a refresh or page switch never wipes out user files
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
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          set({ isLoading: false, error: err.message });
        }
      },
    }),
    {
      name: 'sourcewise-sources',
    }
  )
);

