import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { SessionRow } from '@/components/SessionRow';
import { weekStart, weekDays, addDays, dayName, shortDate, isToday, daysUntil, longDate } from '@/lib/dates';
import { km, clock, DISCIPLINE_LABEL } from '@/lib/format';
import type { Activity, Discipline, Profile, SessionWithActivity, Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Search = { week?: string; who?: string };

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { week, who } = await searchParams;
  const supabase = await supabaseServer();

  const start = week ?? weekStart(new Date());
  const end = addDays(start, 6);
  const days = weekDays(start);

  const [{ data: { user } }, { data: profiles }, { data: settings }, { data: rows }, { data: notes }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('*').order('short_name'),
      supabase.from('settings').select('*').single(),
      supabase
        .from('sessions')
        .select('*, activity:activities(*)')
        .gte('date', start)
        .lte('date', end)
        .order('position'),
      supabase.from('weekly_notes').select('*').eq('week_start', start).limit(1),
    ]);

  if (!profiles?.length) {
    return (
      <div className="empty">
        No profiles yet. Sign in once with each of your Google accounts to create them.
      </div>
    );
  }

  const people = profiles as Profile[];
  // Your own week is the one you open the app to see.
  const current =
    people.find((p) => p.id === who) ?? people.find((p) => p.id === user?.id) ?? people[0];
  const sessions = ((rows ?? []) as SessionWithActivity[]).filter(
    (s) => s.profile_id === current.id,
  );
  const race = settings as Settings | null;
  const note = notes?.[0];

  return (
    <>
      <div className="stack">
        {race && <RaceCard settings={race} />}

        {people.length > 1 && (
          <nav className="switch" aria-label="Whose week">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/?week=${start}&who=${p.id}`}
                data-active={p.id === current.id}
                aria-current={p.id === current.id ? 'page' : undefined}
              >
                {p.short_name}
              </Link>
            ))}
          </nav>
        )}

        <Volume sessions={sessions} />
      </div>

      <WeekNav start={start} who={current.id} />

      {sessions.length === 0 && (
        <div className="empty" style={{ marginTop: 18 }}>
          Nothing planned for {current.short_name} this week.
          <br />
          Load a plan with scripts/load-plan.mjs to fill it in.
        </div>
      )}

      {days.map((day) => {
        const onDay = sessions.filter((s) => s.date === day);
        if (!onDay.length) return null;
        return (
          <section className="day" key={day}>
            <div className="dayhead">
              <span className="dow">{dayName(day)}</span>
              <span className="date">{shortDate(day)}</span>
              {isToday(day) && <span className="today">Today</span>}
            </div>
            {onDay.map((s) => (
              <SessionRow key={s.id} session={s} isToday={isToday(day)} />
            ))}
          </section>
        );
      })}

      {note && (
        <div className="notecard" style={{ marginTop: 22 }}>
          <p className="eyebrow">The week, in short</p>
          <p>{note.body}</p>
        </div>
      )}
    </>
  );
}

function RaceCard({ settings }: { settings: Settings }) {
  const days = daysUntil(settings.race_date);
  return (
    <div className="race">
      <div className="num">{days > 0 ? days : 0}</div>
      <div className="meta">
        <b>{settings.race_name}</b>
        <span>{longDate(settings.race_date)}</span>
        {settings.race_location && <span>{settings.race_location}</span>}
      </div>
    </div>
  );
}

function WeekNav({ start, who }: { start: string; who: string }) {
  const thisWeek = weekStart(new Date());
  return (
    <nav className="weeknav" aria-label="Change week">
      <Link className="btn ghost" href={`/?week=${addDays(start, -7)}&who=${who}`}>
        ← Last week
      </Link>
      {start !== thisWeek && (
        <Link className="btn ghost" href={`/?week=${thisWeek}&who=${who}`}>
          This week
        </Link>
      )}
      <Link className="btn ghost" href={`/?week=${addDays(start, 7)}&who=${who}`}>
        Next week →
      </Link>
    </nav>
  );
}

/** Done against planned, per discipline. Count first, distance second. */
function Volume({ sessions }: { sessions: SessionWithActivity[] }) {
  const order: Discipline[] = ['swim', 'bike', 'run', 'strength'];
  const rows = order
    .map((d) => {
      const mine = sessions.filter((s) => s.discipline === d);
      if (!mine.length) return null;

      const done = mine.filter((s) => s.status === 'done');
      const actual = done.reduce(
        (sum, s) => sum + ((s.activity as Activity | null)?.distance_m ?? 0),
        0,
      );
      const seconds = done.reduce(
        (sum, s) => sum + ((s.activity as Activity | null)?.moving_time_s ?? 0),
        0,
      );

      return {
        discipline: d,
        done: done.length,
        planned: mine.length,
        figure: d === 'strength' || !actual ? clock(seconds) : km(actual, 1),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (!rows.length) return null;

  return (
    <div className="vol">
      {rows.map((r) => (
        <div className="volrow" key={r.discipline}>
          <span className="lab">{DISCIPLINE_LABEL[r.discipline]}</span>
          <span className="bar">
            <i
              style={{
                width: `${Math.round((r.done / r.planned) * 100)}%`,
                background: `var(--${r.discipline})`,
              }}
            />
          </span>
          <span className="fig">
            <b>{r.done}</b>/{r.planned} · {r.figure}
          </span>
        </div>
      ))}
    </div>
  );
}
