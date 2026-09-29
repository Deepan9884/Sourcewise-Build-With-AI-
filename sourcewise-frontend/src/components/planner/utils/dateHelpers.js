/** Date helpers for planner views (UTC-safe, no deps). */
export function toISODate(d) {
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toISOString().slice(0, 10)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function weekDatesISO(startISO) {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(startISO, i))
}

export function startOfWeekISO(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  const dow = d.getUTCDay() // 0 Sun
  const diff = (dow + 6) % 7 // Monday start
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

export function prettyDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

export function daysUntil(iso) {
  if (!iso) return null
  const ms = new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${todayISO()}T00:00:00Z`).getTime()
  return Math.round(ms / (24 * 3600 * 1000))
}

export function hhmm(time) {
  return String(time || '').slice(0, 5)
}
