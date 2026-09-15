import { NextResponse, type NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { freshAccessToken, getActivity, toActivityRow } from '@/lib/strava';
import { linkActivity } from '@/lib/match';

/** Strava pings this once when you create the subscription. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (
    q.get('hub.mode') === 'subscribe' &&
    q.get('hub.verify_token') === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  ) {
    return NextResponse.json({ 'hub.challenge': q.get('hub.challenge') });
  }
  return new NextResponse('no', { status: 403 });
}

type Event = {
  aspect_type: 'create' | 'update' | 'delete';
  object_type: 'activity' | 'athlete';
  object_id: number;
  owner_id: number;
};

/**
 * Strava pushes an event the moment a watch uploads. It wants a 200 inside
 * two seconds, so acknowledge first and do the work afterwards.
 */
export async function POST(request: NextRequest) {
  const event = (await request.json()) as Event;

  if (event.object_type === 'activity') {
    after(async () => {
      try {
        await handle(event);
      } catch (err) {
        console.error('strava webhook', err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}

async function handle(event: Event) {
  const db = supabaseAdmin();

  const { data: account } = await db
    .from('strava_accounts')
    .select('profile_id')
    .eq('athlete_id', event.owner_id)
    .single();

  if (!account) return; // somebody else's athlete id

  if (event.aspect_type === 'delete') {
    // Untick whatever it had ticked, then drop it.
    await db
      .from('sessions')
      .update({ status: 'planned', activity_id: null, matched_automatically: false, completed_at: null })
      .eq('activity_id', event.object_id);
    await db.from('activities').delete().eq('id', event.object_id);
    return;
  }

  const token = await freshAccessToken(account.profile_id);
  const activity = await getActivity(token, event.object_id);

  await db.from('activities').upsert(toActivityRow(activity, account.profile_id));
  await linkActivity(activity.id);
}
