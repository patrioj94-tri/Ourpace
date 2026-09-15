import type { Discipline } from './types';
import { supabaseAdmin } from './supabase/admin';

const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';

/**
 * Both watches sync to Strava, so Strava is the only thing we talk to.
 * Garmin has no API we can use, and doesn't need one.
 */
const SPORT_TO_DISCIPLINE: Record<string, Discipline> = {
  Swim: 'swim',
  Ride: 'bike',
  VirtualRide: 'bike',
  GravelRide: 'bike',
  MountainBikeRide: 'bike',
  EBikeRide: 'bike',
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  WeightTraining: 'strength',
  Workout: 'strength',
  Crossfit: 'strength',
  Yoga: 'strength',
  Elliptical: 'other',
  Walk: 'other',
  Hike: 'other',
};

export function disciplineOf(sportType: string): Discipline {
  return SPORT_TO_DISCIPLINE[sportType] ?? 'other';
}

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
  scope?: string;
};

export async function exchangeCode(code: string): Promise<StravaTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava rejected the code: ${await res.text()}`);
  return res.json();
}

/**
 * Strava access tokens last six hours. Hand this a profile and get back a
 * token that definitely works, refreshing and re-storing it if it had expired.
 */
export async function freshAccessToken(profileId: string): Promise<string> {
  const db = supabaseAdmin();
  const { data: account, error } = await db
    .from('strava_accounts')
    .select('*')
    .eq('profile_id', profileId)
    .single();

  if (error || !account) throw new Error('That profile has not connected Strava yet.');

  const expiresAt = new Date(account.expires_at).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) return account.access_token;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Could not refresh Strava: ${await res.text()}`);

  const tokens: StravaTokens = await res.json();
  await db
    .from('strava_accounts')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq('profile_id', profileId);

  return tokens.access_token;
}

export type StravaActivity = {
  id: number;
  name: string;
  sport_type: string;
  type?: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate?: number;
  calories?: number;
};

export async function listActivities(
  token: string,
  opts: { after?: Date; before?: Date; perPage?: number } = {},
): Promise<StravaActivity[]> {
  const q = new URLSearchParams({ per_page: String(opts.perPage ?? 50) });
  if (opts.after) q.set('after', String(Math.floor(opts.after.getTime() / 1000)));
  if (opts.before) q.set('before', String(Math.floor(opts.before.getTime() / 1000)));

  const res = await fetch(`${API}/athlete/activities?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Strava said: ${await res.text()}`);
  return res.json();
}

export async function getActivity(token: string, id: number): Promise<StravaActivity> {
  const res = await fetch(`${API}/activities/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Strava said: ${await res.text()}`);
  return res.json();
}

/** Strava's shape, flattened into ours. */
export function toActivityRow(a: StravaActivity, profileId: string) {
  return {
    id: a.id,
    profile_id: profileId,
    sport_type: a.sport_type,
    discipline: disciplineOf(a.sport_type),
    name: a.name,
    start_local: a.start_date_local.replace('Z', ''),
    distance_m: a.distance ?? null,
    moving_time_s: a.moving_time ?? null,
    elapsed_time_s: a.elapsed_time ?? null,
    elevation_m: a.total_elevation_gain ?? null,
    avg_speed: a.average_speed ?? null,
    avg_heartrate: a.average_heartrate ?? null,
    calories: a.calories ?? null,
    raw: a as unknown as Record<string, unknown>,
  };
}
