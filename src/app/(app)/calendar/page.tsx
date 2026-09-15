import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { freshGoogleToken, listCalendars, listEvents } from '@/lib/google';
import { weekStart, weekDays, addDays, dayName, shortDate, isToday, timeOfDay } from '@/lib/dates';
import { DISCIPLINE_LABEL } from '@/lib/format';
import type { CalendarEvent, Profile, Session } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const supabase = await supabaseServer();

  const start = week ?? weekStart(new Date());
  const end = addDays(start, 6);
  const days = weekDays(start);

  const [{ data: profiles }, { data: sessions }] = await Promise.all([
    supabase.from('profiles').select('*').order('short_name'),
    supabase.from('sessions').select('*').gte('date', start).lte('date', end),
  ]);

  const people = (profiles ?? []) as Profile[];
  const events = await gatherEvents(people, start, end);
  const connected = events.length > 0;

  return (
    <>
      <p className="eyebrow">
        {shortDate(start)} — {shortDate(end)}
      </p>
      <h2>This week, both of us</h2>
      <p className="sub">
        Everything from your two Google calendars, with the training on top.
      </p>

      <div className="legend">
        {people.map((p) => (
          <span key={p.id}>
            <i style={{ background: `var(--${p.color})` }} />
            {p.short_name}
          </span>
        ))}
        <span>
          <i style={{ background: 'var(--accent)' }} />
          Training
        </span>
      </div>

      {!connected && (
        <div className="empty" style={{ marginBottom: 12 }}>
          No calendar events yet. Sign in with Google and grant calendar access to see them here.
        </div>
      )}

      <div>
        {days.map((day) => {
          const onDay = events.filter((e) => e.start.slice(0, 10) === day);
          const training = ((sessions ?? []) as Session[]).filter((s) => s.date === day);
          if (!onDay.length && !training.length) return null;

          return (
            <div className={`calday${isToday(day) ? ' is-today' : ''}`} key={day}>
              <div className="when">
                <b>{shortDate(day).split(' ')[0]}</b>
                {dayName(day)}
              </div>
              <div>
                {training.map((s) => {
                  const owner = people.find((p) => p.id === s.profile_id);
                  return (
                    <div className="ev" key={s.id}>
                      <i className="dot" style={{ background: 'var(--accent)' }} />
                      <div className="txt">
                        <b>{s.title}</b>
                        <span>
                          {DISCIPLINE_LABEL[s.discipline]}
                          {owner ? ` · ${owner.short_name}` : ''}
                          {s.target ? ` · ${s.target}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {onDay.map((e) => {
                  const owner = people.find((p) => p.id === e.ownerId);
                  return (
                    <div className="ev" key={e.id}>
                      <i className="dot" style={{ background: `var(--${owner?.color ?? 'other'})` }} />
                      <div className="txt">
                        <b>{e.summary}</b>
                        <span>
                          {e.allDay ? 'All day' : timeOfDay(e.start)} · {e.ownerName} /{' '}
                          {e.calendarName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="seg" style={{ marginTop: 18, background: 'none', border: 'none', padding: 0, gap: 8 }}>
        <Link className="btn ghost" href={`/calendar?week=${addDays(start, -7)}`}>
          ← Last week
        </Link>
        <Link className="btn ghost" href={`/calendar?week=${addDays(start, 7)}`}>
          Next week →
        </Link>
      </div>
    </>
  );
}

/** Both calendars, minus the feeds nobody wants in a shared week. */
async function gatherEvents(people: Profile[], from: string, to: string) {
  const timeMin = new Date(`${from}T00:00:00`).toISOString();
  const timeMax = new Date(`${to}T23:59:59`).toISOString();
  const events: CalendarEvent[] = [];

  for (const person of people) {
    const token = await freshGoogleToken(person.id);
    if (!token) continue;

    const calendars = (await listCalendars(token)).filter(
      (c) => !c.id.includes('#holiday') && !c.id.includes('#contacts'),
    );

    for (const calendar of calendars) {
      for (const e of await listEvents(token, calendar.id, timeMin, timeMax)) {
        events.push({
          id: `${person.id}:${e.id}`,
          summary: e.summary ?? '(no title)',
          start: e.start.dateTime ?? `${e.start.date}T00:00:00`,
          end: e.end.dateTime ?? `${e.end.date}T00:00:00`,
          allDay: !e.start.dateTime,
          calendarName: calendar.primary ? 'Personal' : calendar.summary,
          ownerId: person.id,
          ownerName: person.short_name,
          location: e.location ?? null,
        });
      }
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
