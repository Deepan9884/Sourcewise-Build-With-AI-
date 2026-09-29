import { create } from 'zustand'

export interface AdminOverviewStats {
  totalUsers: number
  activeUsers: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  estimatedCost: number
  requestCount: number
  errorCount: number
  tokensByProvider: Record<string, number>
}

interface AdminState {
  stats: (AdminOverviewStats & { providerHealth?: ProviderHealth[] }) | null
  statsPeriod: string
  setStats: (stats: AdminState['stats']) => void
  setStatsPeriod: (statsPeriod: string) => void
  usersCache: Record<string, unknown>
  setUsersCache: (key: string, value: unknown) => void
}

export interface ProviderHealth {
  provider: string
  model?: string
  available: boolean
  role?: string
  error?: string
}

export const useAdminStore = create<AdminState>()((set) => ({
  stats: null,
  statsPeriod: '24h',
  setStats: (stats) => set({ stats }),
  setStatsPeriod: (statsPeriod) => set({ statsPeriod }),
  usersCache: {},
  setUsersCache: (key, value) => set((s) => ({ usersCache: { ...s.usersCache, [key]: value } })),
}))
