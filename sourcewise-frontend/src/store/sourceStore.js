import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSourceStore = create(
  persist(
    (set) => ({
      uploadedSources: [],
      activeSourceIds: [],
      isLoading: false,
      error: null,
      
      addSource: (source) => set((state) => ({ 
        uploadedSources: [...state.uploadedSources, source],
        activeSourceIds: [...state.activeSourceIds, source.id]
      })),
      
      removeSource: (id) => set((state) => ({
        uploadedSources: state.uploadedSources.filter(s => s.id !== id),
        activeSourceIds: state.activeSourceIds.filter(sId => sId !== id)
      })),
      
      toggleActiveSource: (id) => set((state) => ({
        activeSourceIds: state.activeSourceIds.includes(id) 
          ? state.activeSourceIds.filter(sId => sId !== id)
          : [...state.activeSourceIds, id]
      })),
      
      updateSourceStatus: (id, status) => set((state) => ({
        uploadedSources: state.uploadedSources.map(s => s.id === id ? { ...s, status } : s)
      })),
      
      updateSourceChunks: (id, chunksIndexed) => set((state) => ({
        uploadedSources: state.uploadedSources.map(s => s.id === id ? { ...s, chunksIndexed } : s)
      })),
    }),
    {
      name: 'sourcewise-sources',
    }
  )
);
