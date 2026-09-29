import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function headers() {
  const token = useAuthStore.getState().accessToken
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function friendlyError(msg, status) {
  if (/schema cache|Could not find the table/i.test(msg)) {
    const table = (msg.match(/table 'public\.(\w+)'/) || [])[1] || 'study_plans'
    return `Database table "${table}" is missing. Run sourcewise-backend/node-api/v13_study_organizer_schema.sql in your Supabase SQL Editor, then try again.`
  }
  if (status === 401) return 'Your session expired. Please log in again.'
  return msg
}

async function handle(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      msg = data.error || msg
    } catch { /* ignore */ }
    throw new Error(friendlyError(msg, res.status))
  }
  return res.json()
}

export const moodApi = {
  checkin: (payload) =>
    fetch(`${API_URL}/mood/checkin`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(handle),
  current: () => fetch(`${API_URL}/mood/current`, { headers: headers() }).then(handle),
  history: (hours = 168, limit = 50) =>
    fetch(`${API_URL}/mood/history?hours=${hours}&limit=${limit}`, { headers: headers() }).then(handle),
  insights: (days = 14) => fetch(`${API_URL}/mood/insights?days=${days}`, { headers: headers() }).then(handle),
}

export const calendarApi = {
  auth: () => fetch(`${API_URL}/calendar/auth`, { headers: headers() }).then(handle),
  sync: (payload = {}) =>
    fetch(`${API_URL}/calendar/sync`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(handle),
  events: (from, to) => {
    const q = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })
    return fetch(`${API_URL}/calendar/events?${q}`, { headers: headers() }).then(handle)
  },
  conflicts: (slots) =>
    fetch(`${API_URL}/calendar/conflicts`, { method: 'POST', headers: headers(), body: JSON.stringify({ slots }) }).then(handle),
  status: () => fetch(`${API_URL}/calendar/status`, { headers: headers() }).then(handle),
}

export const studyPlansApi = {
  create: (payload) =>
    fetch(`${API_URL}/study-plans`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(handle),
  list: () => fetch(`${API_URL}/study-plans`, { headers: headers() }).then(handle),
  get: (id) => fetch(`${API_URL}/study-plans/${id}`, { headers: headers() }).then(handle),
  update: (id, patch) =>
    fetch(`${API_URL}/study-plans/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }).then(handle),
  remove: (id) => fetch(`${API_URL}/study-plans/${id}`, { method: 'DELETE', headers: headers() }).then(handle),
  generate: (id) =>
    fetch(`${API_URL}/study-plans/${id}/generate`, { method: 'POST', headers: headers() }).then(handle),
  replan: (id, trigger = 'manual', triggerData = {}) =>
    fetch(`${API_URL}/study-plans/${id}/replan`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ trigger, triggerData }),
    }).then(handle),
  schedule: (id, from, to) => {
    const q = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })
    return fetch(`${API_URL}/study-plans/${id}/schedule?${q}`, { headers: headers() }).then(handle)
  },
  today: (id) => fetch(`${API_URL}/study-plans/${id}/today`, { headers: headers() }).then(handle),
  replans: (id) => fetch(`${API_URL}/study-plans/${id}/replans`, { headers: headers() }).then(handle),
  pacing: (id) => fetch(`${API_URL}/study-plans/${id}/pacing`, { headers: headers() }).then(handle),
  subjectTrend: (id, sid) => fetch(`${API_URL}/study-plans/${id}/subjects/${sid}/trend`, { headers: headers() }).then(handle),
  adaptive: (id, moodState) =>
    fetch(`${API_URL}/study-plans/${id}/adaptive`, {
      method: 'POST', headers: headers(), body: JSON.stringify(moodState ? { moodState } : {}),
    }).then(handle),
  adaptiveUndo: (id, undoToken) =>
    fetch(`${API_URL}/study-plans/${id}/adaptive/undo`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ undoToken }),
    }).then(handle),
}

export const scheduleApi = {
  update: (id, patch) =>
    fetch(`${API_URL}/schedule/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }).then(handle),
  complete: (id, payload = {}) =>
    fetch(`${API_URL}/schedule/${id}/complete`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(handle),
  reschedule: (id, payload) =>
    fetch(`${API_URL}/schedule/${id}/reschedule`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) }).then(handle),
  day: (date, planId) => {
    const q = new URLSearchParams({ ...(planId ? { plan_id: planId } : {}) })
    return fetch(`${API_URL}/schedule/day/${date}?${q}`, { headers: headers() }).then(handle)
  },
}

export function subscribeToEvents(onEvent) {
  const token = useAuthStore.getState().accessToken
  const es = new EventSource(`${API_URL}/events?token=${encodeURIComponent(token || '')}`)
  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data))
    } catch { /* ignore */ }
  }
  return () => es.close()
}
