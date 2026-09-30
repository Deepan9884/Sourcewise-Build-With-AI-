import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useSourceStore = create(
  persist(
    (set, get) => ({
      uploadedSources: [],
      activeSourceIds: [],
      isLoading: false,
      error: null,
      
      addSource: (source) => set((state) => {
        const filtered = state.uploadedSources.filter((s) => s.id !== source.id);
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
            const formatted = list.map((s) => ({
              id: s.id,
              name: s.name || s.title || 'Untitled Document',
              title: s.title || s.name || 'Untitled Document',
              size: s.size || 0,
              type: s.type || 'pdf',
              status: s.status || 'ready',
              chunksIndexed: s.chunks_indexed || s.chunksIndexed || 0,
              createdAt: s.created_at,
            }));

            set((state) => {
              const backendIds = new Set(formatted.map((s) => s.id));
              // Keep local items that are in progress or not in backend
              const localPending = state.uploadedSources.filter(
                (s) => !backendIds.has(s.id) && (s.status === 'uploading' || s.status === 'processing')
              );
              // If backend has items, combine; if backend returned empty, preserve local items if available
              const combined = formatted.length > 0
                ? [...formatted, ...localPending]
                : (state.uploadedSources.length > 0 ? state.uploadedSources : []);

              const validIds = state.activeSourceIds.filter((id) => combined.some((s) => s.id === id));
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

