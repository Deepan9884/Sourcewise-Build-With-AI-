import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function headers(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      msg = (data as { error?: string }).error || msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export interface AdminUserRow {
  id: string
  name?: string
  email?: string
  tier: string
  isAdmin: boolean
  creditsTotal: number
  creditsUsed: number
  creditsRemaining: number
  sessionsCount: number
  createdAt: string
}

export interface UsersResponse {
  data: AdminUserRow[]
  pagination: { total: number; page: number; limit: number; hasMore: boolean }
}

export interface TimeseriesPoint {
  period: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
  requestCount: number
}

export interface UsageBreakdown {
  byProvider: Record<string, { tokens: number; cost: number }>
  byModel: Record<string, { tokens: number; cost: number }>
  byEndpoint: Record<string, { tokens: number; requests: number }>
  topUsers: { userId: string; email?: string; name?: string; tokens: number; cost: number; requests: number }[]
}

export interface UsageResponse {
  timeseries: TimeseriesPoint[]
  breakdown: UsageBreakdown
}

export interface PlanRow {
  id: string
  userId: string
  name: string
  status: string
  dailyBudgetMinutes: number
  subjects: number
  subjectNames: string[]
  totalSlots: number
  completedSlots: number
  pacePct: number
  createdAt: string
}

export interface PlansResponse {
  data: PlanRow[]
  pagination: { total: number; page: number; limit: number; hasMore: boolean }
}

export interface ContentStats {
  totalSources: number
  totalChunks: number
  analyzedCount: number
  analysisRate: number
  difficultyBreakdown: Record<string, number>
  byType: Record<string, number>
}

export interface MoodStats {
  days: number
  checkins: number
  distribution: Record<string, number>
  avgEnergy: number | null
  avgFocus: number | null
  avgStress: number | null
  trend: string
}

export interface PricingRow {
  provider: string
  model: string
  input_price_per_1k_tokens: number
  output_price_per_1k_tokens: number
  is_active: boolean
}

export interface ActivityItem {
  id: string
  kind: string
  at: string
  summary: string
  meta?: Record<string, string>
}

export const adminApi = {
  stats: (period = '24h') =>
    fetch(`${API_URL}/admin/stats?period=${period}`, { headers: headers() }).then(handle),
  users: ({ page = 1, limit = 20, tier = '', search = '' }: { page?: number; limit?: number; tier?: string; search?: string } = {}) => {
    const q = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(tier ? { tier } : {}),
      ...(search ? { search } : {}),
    })
    return fetch(`${API_URL}/admin/users?${q}`, { headers: headers() }).then(handle<UsersResponse>)
  },
  userDetail: (id: string) =>
    fetch(`${API_URL}/admin/users/${id}`, { headers: headers() }).then(handle),
  grantCredits: (id: string, amount: number, reason = 'grant', description = '') =>
    fetch(`${API_URL}/admin/users/${id}/credits`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ amount, reason, description }),
    }).then(handle),
  usage: ({ period = '24h', groupBy = 'day', provider = '' }: { period?: string; groupBy?: string; provider?: string } = {}) => {
    const q = new URLSearchParams({ period, groupBy, ...(provider ? { provider } : {}) })
    return fetch(`${API_URL}/admin/usage?${q}`, { headers: headers() }).then(handle<UsageResponse>)
  },
  providerHealth: () =>
    fetch(`${API_URL}/admin/providers/health`, { headers: headers() }).then(handle),
  providerCosts: (period = '30d') =>
    fetch(`${API_URL}/admin/providers/costs?period=${period}`, { headers: headers() }).then(handle),
  uptime: (period = '30d') =>
    fetch(`${API_URL}/admin/system/uptime?period=${period}`, { headers: headers() }).then(handle),
  pricing: () =>
    fetch(`${API_URL}/admin/pricing`, { headers: headers() }).then(handle<PricingRow[]>),
  updatePricing: (provider: string, model: string, inputPrice: number, outputPrice: number) =>
    fetch(`${API_URL}/admin/pricing`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ provider, model, inputPrice, outputPrice }),
    }).then(handle),
  plans: ({ page = 1, limit = 20, status = '' }: { page?: number; limit?: number; status?: string } = {}) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit), ...(status ? { status } : {}) })
    return fetch(`${API_URL}/admin/plans?${q}`, { headers: headers() }).then(handle<PlansResponse>)
  },
  content: () =>
    fetch(`${API_URL}/admin/content`, { headers: headers() }).then(handle<ContentStats>),
  mood: (days = 30) =>
    fetch(`${API_URL}/admin/mood?days=${days}`, { headers: headers() }).then(handle<MoodStats>),
  activityStream: (onItems: (items: ActivityItem[]) => void): (() => void) => {
    const token = useAuthStore.getState().accessToken
    // SSE endpoint needs auth; EventSource can't set headers, so the token
    // rides the query string (short-lived admin JWT, same pattern as /events).
    const es = new EventSource(`${API_URL}/admin/activity?token=${encodeURIComponent(token || '')}`)
    es.addEventListener('activity', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { items: ActivityItem[] }
        if (data.items?.length) onItems(data.items)
      } catch {
        /* ignore */
      }
    })
    return () => es.close()
  },
}
