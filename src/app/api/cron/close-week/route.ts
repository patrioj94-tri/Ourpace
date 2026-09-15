import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { toISODate, addDays } from '@/lib/dates';

/**
 * Anything still open two days after the fact was not done. Two days, not one,
 * because Strava uploads are sometimes late and people sometimes ride on Monday
 * what they planned for Sunday.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'nope' }, { status: 401 });
  }

  const cutoff = addDays(toISODate(new Date()), -2);

  const { data, error } = await supabaseAdmin()
    .from('sessions')
    .update({ status: 'missed' })
    .eq('status', 'planned')
    .lt('date', cutoff)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, closed: data?.length ?? 0, cutoff });
}
