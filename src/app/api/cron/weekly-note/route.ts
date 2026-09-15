import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { weekStart, addDays, longDate } from '@/lib/dates';
import { km, clock } from '@/lib/format';

export const maxDuration = 60;

/**
 * Sunday evening. Reads the week that just happened and writes the two of you
 * a short note about it.
 *
 * The ticking-off is done by arithmetic elsewhere — this is only the voice.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'nope' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ skipped: 'no ANTHROPIC_API_KEY set' });
  }

  const db = supabaseAdmin();
  const start = weekStart(new Date());
  const end = addDays(start, 6);

  const [{ data: profiles }, { data: sessions }, { data: activities }, { data: settings }] =
    await Promise.all([
      db.from('profiles').select('id, short_name'),
      db.from('sessions').select('*').gte('date', start).lte('date', end),
      db.from('activities').select('*').gte('start_local', start).lte('start_local', `${end}T23:59:59`),
      db.from('settings').select('*').single(),
    ]);

  if (!profiles?.length) return NextResponse.json({ error: 'no profiles' }, { status: 400 });

  const nameOf = new Map(profiles.map((p) => [p.id, p.short_name]));
  const summary = profiles.map((p) => {
    const mine = (sessions ?? []).filter((s) => s.profile_id === p.id);
    const did = (activities ?? []).filter((a) => a.profile_id === p.id);
    return {
      name: p.short_name,
      planned: mine.length,
      done: mine.filter((s) => s.status === 'done').length,
      missed: mine.filter((s) => s.status === 'missed').length,
      sessions: did.map((a) => ({
        sport: a.discipline,
        name: a.name,
        day: a.start_local.slice(0, 10),
        distance: km(a.distance_m),
        time: clock(a.moving_time_s),
      })),
    };
  });

  const daysToRace = Math.round(
    (Date.parse(settings!.race_date) - Date.parse(start)) / 86_400_000,
  );

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-opus-5',
    max_tokens: 2000,
    output_config: { effort: 'low' },
    system: [
      'You write the weekly note inside Our Pace, a private app shared by two people',
      `training together for ${settings!.race_name}.`,
      'Write to both of them, warmly, like a friend who has seen the data — not a coach and not a robot.',
      'Four sentences at most. No headings, no bullet points, no emoji, no greeting.',
      'Name something specific that actually happened: a real distance, a pace, a day of the week.',
      'If somebody missed sessions, mention it lightly once. Never nag and never congratulate emptily.',
    ].join(' '),
    messages: [
      {
        role: 'user',
        content: [
          `Week of ${longDate(start)} to ${longDate(end)}.`,
          `${daysToRace} days until ${settings!.race_name}.`,
          '',
          JSON.stringify(summary, null, 2),
        ].join('\n'),
      },
    ],
  });

  const body = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!body) return NextResponse.json({ error: 'the model returned nothing' }, { status: 502 });

  await db.from('weekly_notes').upsert(
    { week_start: start, body, stats: { summary, daysToRace } },
    { onConflict: 'week_start' },
  );

  return NextResponse.json({ ok: true, week_start: start, body, people: [...nameOf.values()] });
}
