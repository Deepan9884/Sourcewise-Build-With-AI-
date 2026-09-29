/**
 * CalendarService — Google Calendar OAuth + sync + conflict detection.
 * Token storage uses AES-GCM (utils/encryption). All DB access defensive.
 */
const axios = require('axios');
const supabase = require('../utils/supabase');
const { encrypt, decrypt } = require('../utils/encryption');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly'];

function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/calendar/callback',
  };
}

function isConfigured() {
  const c = googleConfig();
  return !!(c.clientId && c.clientSecret);
}

function getAuthUrl(state) {
  const c = googleConfig();
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const c = googleConfig();
  const { data } = await axios.post(GOOGLE_TOKEN_URL, {
    code,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirectUri,
    grant_type: 'authorization_code',
  }, { headers: { 'Content-Type': 'application/json' } });
  return data; // { access_token, refresh_token, expires_in, scope }
}

async function refreshAccessToken(refreshToken) {
  const c = googleConfig();
  const { data } = await axios.post(GOOGLE_TOKEN_URL, {
    refresh_token: refreshToken,
    client_id: c.clientId,
    client_secret: c.clientSecret,
    grant_type: 'refresh_token',
  }, { headers: { 'Content-Type': 'application/json' } });
  return data;
}

async function connectGoogleCalendar(userId, code) {
  const tokens = await exchangeCodeForTokens(code);
  const row = {
    user_id: userId,
    provider: 'google_calendar',
    access_token_encrypted: encrypt(tokens.access_token),
    refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    scopes: (tokens.scope || SCOPES.join(' ')).split(' '),
    is_active: true,
    last_sync: null,
  };
  const { data, error } = await supabase.from('user_integrations')
    .upsert(row, { onConflict: 'user_id,provider' }).select().single();
  if (error) throw error;
  return { connected: true, scopes: row.scopes, expiresAt: row.token_expires_at, id: data?.id };
}

async function getIntegration(userId) {
  try {
    const { data } = await supabase.from('user_integrations')
      .select('*').eq('user_id', userId).eq('provider', 'google_calendar').maybeSingle();
    return data || null;
  } catch (e) {
    return null;
  }
}

async function getValidAccessToken(userId) {
  const integ = await getIntegration(userId);
  if (!integ || !integ.is_active) throw new Error('Google Calendar not connected');
  const expiresAt = integ.token_expires_at ? new Date(integ.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() > 60 * 1000) {
    return decrypt(integ.access_token_encrypted);
  }
  // Refresh
  if (!integ.refresh_token_encrypted) throw new Error('Token expired and no refresh token — reconnect calendar');
  const refreshToken = decrypt(integ.refresh_token_encrypted);
  const fresh = await refreshAccessToken(refreshToken);
  const updated = {
    access_token_encrypted: encrypt(fresh.access_token),
    token_expires_at: new Date(Date.now() + (fresh.expires_in || 3600) * 1000).toISOString(),
    last_sync: integ.last_sync,
  };
  await supabase.from('user_integrations').update(updated).eq('id', integ.id);
  return fresh.access_token;
}

function classifyEventType(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  if (/\bexam\b|\btest\b|\bquiz\b|\bfinal\b|\bmidterm\b/.test(text)) return 'exam';
  if (/\bclass\b|\blecture\b|\blab\b|\bseminar\b|\bschool\b|\bcollege\b/.test(text)) return 'class';
  if (/\bwork\b|\bshift\b|\bmeeting\b|\bstandup\b|\boffice\b|\binterview\b/.test(text)) return 'work';
  if (/\bdoctor\b|\bdentist\b|\bappointment\b|\bflight\b|\btrip\b/.test(text)) return 'appointment';
  return 'personal';
}

async function syncCalendarEvents(userId, { timeMin, timeMax } = {}) {
  const accessToken = await getValidAccessToken(userId);
  const now = new Date();
  const min = timeMin || now.toISOString();
  const max = timeMax || new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await axios.get(`${GOOGLE_CALENDAR_API}/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000,
  });
  const calendars = (data.items || []).filter((c) => c.primary || c.selected).slice(0, 5);
  let synced = 0;
  const errors = [];
  for (const cal of calendars) {
    try {
      const { data: ev } = await axios.get(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(cal.id)}/events`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { timeMin: min, timeMax: max, singleEvents: true, orderBy: 'startTime', maxResults: 250 },
        timeout: 15000,
      });
      for (const e of ev.items || []) {
        if (e.status === 'cancelled') continue;
        const start = e.start?.dateTime || (e.start?.date ? `${e.start.date}T00:00:00Z` : null);
        const end = e.end?.dateTime || (e.end?.date ? `${e.end.date}T23:59:59Z` : null);
        if (!start || !end) continue;
        const row = {
          user_id: userId,
          google_event_id: e.id,
          title: e.summary || '(no title)',
          description: e.description || null,
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          is_all_day: !e.start?.dateTime,
          event_type: classifyEventType(e.summary, e.description),
          source_calendar_id: cal.id,
          recurrence_rule: (e.recurrence || []).join(';') || null,
          last_synced: new Date().toISOString(),
        };
        try {
          await supabase.from('calendar_events').upsert(row, { onConflict: 'google_event_id' });
          synced += 1;
        } catch (dbErr) { errors.push(dbErr.message); }
      }
    } catch (calErr) { errors.push(calErr.message); }
  }
  try {
    await supabase.from('user_integrations').update({ last_sync: new Date().toISOString() })
      .eq('user_id', userId).eq('provider', 'google_calendar');
  } catch (e) { /* ignore */ }
  return { synced, errors: errors.slice(0, 5) };
}

async function getEvents(userId, { from, to } = {}) {
  try {
    let q = supabase.from('calendar_events').select('*').eq('user_id', userId).order('start_time', { ascending: true }).limit(500);
    if (from) q = q.gte('end_time', from);
    if (to) q = q.lte('start_time', to);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
}

/** Check proposed slots [{date, start_time, end_time}] against calendar events. */
async function getConflicts(userId, proposedSlots = []) {
  if (!proposedSlots.length) return [];
  const dates = [...new Set(proposedSlots.map((s) => s.date))].sort();
  const from = new Date(`${dates[0]}T00:00:00Z`).toISOString();
  const to = new Date(`${dates[dates.length - 1]}T23:59:59Z`).toISOString();
  const events = await getEvents(userId, { from, to });
  const conflicts = [];
  for (const slot of proposedSlots) {
    const sStart = new Date(`${slot.date}T${slot.start_time}Z`).getTime();
    const sEnd = new Date(`${slot.date}T${slot.end_time}Z`).getTime();
    for (const ev of events) {
      const eStart = new Date(ev.start_time).getTime();
      const eEnd = new Date(ev.end_time).getTime();
      if (sStart < eEnd && sEnd > eStart) {
        conflicts.push({ slot, event: { id: ev.id, title: ev.title, start_time: ev.start_time, end_time: ev.end_time, event_type: ev.event_type } });
      }
    }
  }
  return conflicts;
}

/** Free windows for a date given booked events + preferred bounds. Returns [{start, end}] in HH:MM. */
function getAvailableWindows(bookedEvents, date, { dayStart = '08:00', dayEnd = '22:00', minSlotMinutes = 30 } = {}) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const busy = bookedEvents
    .map((e) => {
      const d = new Date(e.start_time);
      const dayStr = d.toISOString().slice(0, 10);
      if (dayStr !== date) return null;
      const s = new Date(e.start_time); const en = new Date(e.end_time);
      return [s.getUTCHours() * 60 + s.getUTCMinutes(), en.getUTCHours() * 60 + en.getUTCMinutes()];
    })
    .filter(Boolean)
    .sort((a, b) => a[0] - b[0]);
  const windows = [];
  let cursor = toMin(dayStart);
  const end = toMin(dayEnd);
  for (const [bs, be] of busy) {
    if (bs - cursor >= minSlotMinutes) windows.push({ start: toHHMM(cursor), end: toHHMM(bs) });
    cursor = Math.max(cursor, be);
  }
  if (end - cursor >= minSlotMinutes) windows.push({ start: toHHMM(cursor), end: toHHMM(end) });
  return windows;
}

module.exports = {
  SCOPES,
  isConfigured,
  getAuthUrl,
  connectGoogleCalendar,
  getIntegration,
  syncCalendarEvents,
  getEvents,
  getConflicts,
  getAvailableWindows,
  classifyEventType,
};
