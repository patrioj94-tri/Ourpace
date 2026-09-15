import { supabaseAdmin } from './supabase/admin';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/calendar/v3';

/**
 * Signing in with Google left us a refresh token. Trade it for an access
 * token whenever we need one — they last an hour and aren't worth storing.
 */
export async function freshGoogleToken(profileId: string): Promise<string | null> {
  const { data: account } = await supabaseAdmin()
    .from('google_accounts')
    .select('refresh_token')
    .eq('profile_id', profileId)
    .single();

  if (!account?.refresh_token) return null;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token ?? null;
}

export type GoogleCalendar = { id: string; summary: string; primary?: boolean };

export async function listCalendars(token: string): Promise<GoogleCalendar[]> {
  const res = await fetch(`${API}/users/me/calendarList?maxResults=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.items ?? [];
}

export type GoogleEvent = {
  id: string;
  summary?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};

export async function listEvents(
  token: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const q = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',      // expand recurring events into real ones
    orderBy: 'startTime',
    maxResults: '100',
  });

  const res = await fetch(`${API}/calendars/${encodeURIComponent(calendarId)}/events?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.items ?? [];
}

/** Puts a training session on the shared calendar. */
export async function createEvent(
  token: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    timeZone: string;
  },
): Promise<string | null> {
  const res = await fetch(`${API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: event.timeZone },
      end: { dateTime: event.end, timeZone: event.timeZone },
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.id ?? null;
}
