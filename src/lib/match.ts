import type { Session } from './types';
import { supabaseAdmin } from './supabase/admin';

type ActivityRow = {
  id: number;
  profile_id: string;
  discipline: string;
  start_local: string;
  distance_m: number | null;
  moving_time_s: number | null;
};

/**
 * How well does a Strava activity answer a planned session?
 *
 * Deliberately not an LLM: "did we do the Thursday run" is arithmetic, and
 * arithmetic does not hallucinate. Returns null when the two can't be the
 * same thing at all, otherwise 0-100.
 */
export function scoreMatch(activity: ActivityRow, session: Session): number | null {
  if (activity.discipline !== session.discipline) return null;

  const activityDate = activity.start_local.slice(0, 10);
  const offset = Math.abs(
    (Date.parse(`${activityDate}T00:00:00`) - Date.parse(`${session.date}T00:00:00`)) / 86_400_000,
  );
  // A session done the next morning still counts. Three days later doesn't.
  if (offset > 1) return null;

  let score = 100 - offset * 35;

  const target = session.target_distance_m;
  if (target && activity.distance_m) {
    const ratio = activity.distance_m / target;
    // Half the planned distance is a different session, not a bad one.
    if (ratio < 0.5) return null;
    score -= Math.min(40, Math.abs(1 - ratio) * 60);
  } else if (session.target_duration_s && activity.moving_time_s) {
    const ratio = activity.moving_time_s / session.target_duration_s;
    if (ratio < 0.5) return null;
    score -= Math.min(40, Math.abs(1 - ratio) * 60);
  }

  return Math.max(0, Math.round(score));
}

/** Above this we tick it silently. Below it we ask. */
export const CONFIDENT = 65;

/**
 * Called whenever an activity lands. Finds the session it most likely
 * answers and ticks it off. Anything doubtful is left open with the activity
 * attached, so the app can ask rather than guess wrong.
 */
export async function linkActivity(activityId: number): Promise<{
  matched: boolean;
  sessionId?: string;
  score?: number;
}> {
  const db = supabaseAdmin();

  const { data: activity } = await db
    .from('activities')
    .select('id, profile_id, discipline, start_local, distance_m, moving_time_s')
    .eq('id', activityId)
    .single();

  if (!activity) return { matched: false };

  const day = activity.start_local.slice(0, 10);
  const { data: candidates } = await db
    .from('sessions')
    .select('*')
    .eq('profile_id', activity.profile_id)
    .eq('status', 'planned')
    .gte('date', shift(day, -1))
    .lte('date', shift(day, 1));

  if (!candidates?.length) return { matched: false };

  let best: { session: Session; score: number } | null = null;
  for (const session of candidates as Session[]) {
    const score = scoreMatch(activity as ActivityRow, session);
    if (score !== null && (!best || score > best.score)) best = { session, score };
  }

  if (!best || best.score < CONFIDENT) return { matched: false, score: best?.score };

  await db
    .from('sessions')
    .update({
      status: 'done',
      activity_id: activity.id,
      matched_automatically: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', best.session.id);

  return { matched: true, sessionId: best.session.id, score: best.score };
}

function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
