import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { freshAccessToken, listActivities, toActivityRow } from '@/lib/strava';
import { linkActivity } from '@/lib/match';

/**
 * Backfill. Webhooks cover everything from now on; this is for the history,
 * and for the times a webhook goes missing.
 *
 * Signed in: syncs you. With the cron secret: syncs both of you.
 */
export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get('days') ?? 30);
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  const isCron = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;

  let profileIds: string[];

  if (isCron) {
    const { data } = await supabaseAdmin().from('strava_accounts').select('profile_id');
    profileIds = (data ?? []).map((r) => r.profile_id);
  } else {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });
    profileIds = [user.id];
  }

  const db = supabaseAdmin();
  const after = new Date(Date.now() - days * 86_400_000);
  const report: Record<string, { imported: number; matched: number }> = {};

  for (const profileId of profileIds) {
    try {
      const token = await freshAccessToken(profileId);
      const activities = await listActivities(token, { after, perPage: 100 });

      if (activities.length) {
        await db.from('activities').upsert(activities.map((a) => toActivityRow(a, profileId)));
      }

      let matched = 0;
      for (const a of activities) {
        const result = await linkActivity(a.id);
        if (result.matched) matched += 1;
      }

      await db
        .from('strava_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('profile_id', profileId);

      report[profileId] = { imported: activities.length, matched };
    } catch (err) {
      report[profileId] = { imported: 0, matched: 0 };
      console.error('sync failed for', profileId, err);
    }
  }

  return NextResponse.json({ ok: true, days, report });
}
