import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { freshGoogleToken, listCalendars, listEvents } from '@/lib/google';
import type { CalendarEvent } from '@/lib/types';

/** Both of your Google calendars, merged into one week. */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });

  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');
  if (!from || !to) return NextResponse.json({ error: 'need from and to' }, { status: 400 });

  const timeMin = new Date(`${from}T00:00:00`).toISOString();
  const timeMax = new Date(`${to}T23:59:59`).toISOString();

  const { data: profiles } = await supabaseAdmin().from('profiles').select('id, short_name');
  const events: CalendarEvent[] = [];

  for (const profile of profiles ?? []) {
    const token = await freshGoogleToken(profile.id);
    if (!token) continue;

    const calendars = (await listCalendars(token)).filter(
      // Holiday feeds are noise in a shared week.
      (c) => !c.id.includes('#holiday') && !c.id.includes('#contacts'),
    );

    for (const calendar of calendars) {
      for (const e of await listEvents(token, calendar.id, timeMin, timeMax)) {
        const allDay = !e.start.dateTime;
        events.push({
          id: `${profile.id}:${e.id}`,
          summary: e.summary ?? '(no title)',
          start: e.start.dateTime ?? `${e.start.date}T00:00:00`,
          end: e.end.dateTime ?? `${e.end.date}T00:00:00`,
          allDay,
          calendarName: calendar.primary ? 'Personal' : calendar.summary,
          ownerId: profile.id,
          ownerName: profile.short_name,
          location: e.location ?? null,
        });
      }
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return NextResponse.json({ events });
}
