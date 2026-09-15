#!/usr/bin/env node
/**
 * Generates the road to Ironman 70.3 Málaga as a CSV the loader understands.
 *
 *   node scripts/build-plan.mjs > plans/malaga-70.3.csv
 *   node scripts/build-plan.mjs --summary        # weekly volumes, to eyeball
 *
 * Forty weeks, Monday 4 January 2027 to race day on Sunday 10 October 2027,
 * with the Seville half marathon built in as a real race rather than ignored.
 *
 * Targets are written as efforts, not paces — the two of you are not the same
 * runner, and "threshold" means the right thing for both. Distances are always
 * filled in, because that is what lets the app tick sessions off from Strava.
 *
 * Change RACE_DAY and everything downstream moves with it.
 */

const PLAN_START = '2027-01-04'; // Monday
const SEVILLE = { week: 7, name: 'Seville Half Marathon' };
const RACE_DAY = '2027-10-10'; // Sunday, week 40

// -------------------------------------------------------------- scaffolding

const DAY = 86_400_000;
const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(`${s}T12:00:00Z`);
const dateOf = (week, dow) => iso(new Date(parse(PLAN_START).getTime() + ((week - 1) * 7 + dow) * DAY));

/** Straight line from a to b across a phase. */
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Three weeks up, one week down. The recovery week is what makes the next
 * three possible, so it is part of the plan and not a failure of it.
 */
const loadFor = (weekInPhase) => (weekInPhase % 4 === 0 ? 0.65 : 1);

const PHASES = [
  { name: 'seville', from: 1,  to: 7 },
  { name: 'recover', from: 8,  to: 8 },
  { name: 'base',    from: 9,  to: 20 },
  { name: 'recover', from: 21, to: 21 },
  { name: 'build',   from: 22, to: 33 },
  { name: 'recover', from: 34, to: 34 },
  { name: 'peak',    from: 35, to: 37 },
  { name: 'taper',   from: 38, to: 40 },
];

const phaseOf = (week) => PHASES.find((p) => week >= p.from && week <= p.to);

// ------------------------------------------------------------------ weeks

/** dow: 0 = Monday. Distances in metres, durations in seconds. */
function sevilleWeek(week, t, load) {
  // Week 7 is race week — everything shrinks and sharpens.
  if (week === SEVILLE.week) {
    return [
      { dow: 0, discipline: 'swim', title: 'Loosener swim', target: 'Easy, nothing hard', m: 1500 },
      { dow: 1, discipline: 'run', title: 'Strides', target: '5 km easy + 6 × 20 s fast', m: 6000 },
      { dow: 2, discipline: 'bike', title: 'Spin', target: '45 min, keep it light', s: 2700 },
      { dow: 3, discipline: 'run', title: 'Easy run', target: '5 km, legs only', m: 5000 },
      { dow: 5, discipline: 'run', title: 'Shakeout', target: '3 km + 4 × 20 s at race pace', m: 3000 },
      { dow: 6, discipline: 'run', title: SEVILLE.name, target: 'Race day. Go and enjoy it.', m: 21097 },
    ];
  }

  return [
    { dow: 0, discipline: 'swim', title: 'Technique swim', target: 'Drills and aerobic sets', m: r(lerp(2000, 2600, t) * load) },
    { dow: 1, discipline: 'run', title: 'Threshold intervals', target: `${5 + Math.round(t * 1)} × 1 km at threshold, 90 s jog`, m: r(lerp(8000, 11000, t) * load) },
    { dow: 2, discipline: 'bike', title: 'Zone 2 ride', target: 'Steady, spin the legs out', s: r(lerp(3600, 4500, t) * load) },
    { dow: 3, discipline: 'run', title: 'Easy run', target: 'Conversational the whole way', m: r(lerp(8000, 10000, t) * load) },
    { dow: 4, discipline: 'strength', title: 'Gym', target: 'Legs, glutes and core', s: 2700 },
    { dow: 5, discipline: 'bike', title: 'Easy ride', target: '90 min, nothing hard', s: r(lerp(4500, 5400, t) * load) },
    { dow: 6, discipline: 'run', title: 'Long run', target: 'Last 5 km at half-marathon effort', m: r(lerp(14000, 20000, t) * load) },
  ];
}

function recoverWeek() {
  return [
    { dow: 0, discipline: 'swim', title: 'Easy swim', target: 'Feel the water, no sets', m: 1800 },
    { dow: 2, discipline: 'bike', title: 'Easy spin', target: '60 min, flat', s: 3600 },
    { dow: 3, discipline: 'run', title: 'Easy run', target: 'Short and slow', m: 6000 },
    { dow: 4, discipline: 'strength', title: 'Mobility', target: '30 min, hips and ankles', s: 1800 },
    { dow: 6, discipline: 'run', title: 'Easy run', target: 'However far feels good', m: 8000 },
  ];
}

function baseWeek(week, t, load) {
  const sessions = [
    { dow: 0, discipline: 'swim', title: 'Technique swim', target: 'Drills, then 10 × 100 m steady', m: r(lerp(2400, 3200, t) * load) },
    { dow: 1, discipline: 'run', title: 'Threshold intervals', target: '4 × 6 min at threshold, 2 min jog', m: r(lerp(9000, 12000, t) * load) },
    { dow: 2, discipline: 'bike', title: 'Endurance ride', target: 'Zone 2 with 3 × 8 min cadence work', m: r(lerp(35000, 55000, t) * load) },
    { dow: 3, discipline: 'swim', title: 'Endurance swim', target: 'Long continuous sets', m: r(lerp(2600, 3600, t) * load) },
    { dow: 3, discipline: 'run', title: 'Easy run', target: 'Off the back of the swim, easy', m: r(lerp(8000, 10000, t) * load) },
    { dow: 4, discipline: 'strength', title: 'Gym', target: 'Legs, glutes and core', s: 2700 },
    { dow: 5, discipline: 'bike', title: 'Long ride', target: 'Steady, together', m: r(lerp(60000, 100000, t) * load) },
    { dow: 6, discipline: 'run', title: 'Long run', target: 'Flat and steady', m: r(lerp(14000, 20000, t) * load) },
  ];

  // Halfway through base, start running off the bike. It is the thing that
  // decides a 70.3, and it has to be practised.
  if (week >= 15) {
    sessions.push({
      dow: 5, discipline: 'run', title: 'Brick run', target: 'Straight off the bike, easy', m: r(3000 * load),
    });
  }
  return sessions;
}

function buildWeek(week, t, load) {
  const sessions = [
    { dow: 0, discipline: 'swim', title: 'Threshold swim', target: '8 × 200 m at race effort', m: r(lerp(3000, 3600, t) * load) },
    { dow: 1, discipline: 'run', title: 'Race-pace intervals', target: '5 × 8 min at 70.3 run effort', m: r(lerp(11000, 13000, t) * load) },
    { dow: 2, discipline: 'bike', title: 'Sweet-spot ride', target: '3 × 15 min just under threshold', m: r(lerp(45000, 60000, t) * load) },
    { dow: 3, discipline: 'swim', title: 'Open water', target: 'Sighting, straight lines, no wall', m: r(lerp(3000, 3800, t) * load) },
    { dow: 3, discipline: 'run', title: 'Easy run', target: 'Recovery pace, properly easy', m: r(lerp(9000, 11000, t) * load) },
    { dow: 4, discipline: 'strength', title: 'Gym', target: 'Heavier, lower reps', s: 2700 },
    { dow: 5, discipline: 'bike', title: 'Long ride', target: 'Last hour at race effort', m: r(lerp(90000, 140000, t) * load) },
    { dow: 5, discipline: 'run', title: 'Brick run', target: 'Off the bike at race pace', m: r(lerp(4000, 8000, t) * load) },
    { dow: 6, discipline: 'run', title: 'Long run', target: 'Negative split it', m: r(lerp(16000, 22000, t) * load) },
  ];

  // A tune-up race, to find out what has actually changed.
  if (week === 28) {
    return [
      { dow: 0, discipline: 'swim', title: 'Easy swim', target: 'Loosen off', m: 2000 },
      { dow: 2, discipline: 'bike', title: 'Openers', target: '45 min with 4 × 2 min at race effort', s: 2700 },
      { dow: 3, discipline: 'run', title: 'Strides', target: '5 km + 6 × 20 s', m: 5000 },
      { dow: 6, discipline: 'swim', title: 'Olympic tune-up — swim', target: 'Dress rehearsal, hard', m: 1500 },
      { dow: 6, discipline: 'bike', title: 'Olympic tune-up — bike', target: 'Race effort', m: 40000 },
      { dow: 6, discipline: 'run', title: 'Olympic tune-up — run', target: 'Hold on', m: 10000 },
    ];
  }
  return sessions;
}

function peakWeek(week, t, load) {
  // The middle peak week is the full dress rehearsal.
  if (week === 36) {
    return [
      { dow: 0, discipline: 'swim', title: 'Race-pace swim', target: '2 × 900 m at race effort', m: 3400 },
      { dow: 1, discipline: 'run', title: 'Race-pace intervals', target: '4 × 10 min at 70.3 effort', m: 13000 },
      { dow: 2, discipline: 'bike', title: 'Sweet-spot ride', target: '3 × 20 min', m: 55000 },
      { dow: 3, discipline: 'swim', title: 'Open water', target: 'Wetsuit, sighting, starts', m: 3000 },
      { dow: 4, discipline: 'strength', title: 'Gym', target: 'Light, keep it moving', s: 2400 },
      { dow: 5, discipline: 'bike', title: 'Race simulation — bike', target: '90 km at exactly race effort. Practise the food.', m: 90000 },
      { dow: 5, discipline: 'run', title: 'Race simulation — run', target: '12 km straight off, race pace', m: 12000 },
      { dow: 6, discipline: 'run', title: 'Easy run', target: 'Shake yesterday out', m: 10000 },
    ];
  }

  return [
    { dow: 0, discipline: 'swim', title: 'Race-pace swim', target: '4 × 400 m at race effort', m: r(lerp(3400, 3800, t) * load) },
    { dow: 1, discipline: 'run', title: 'Race-pace intervals', target: '5 × 10 min at 70.3 effort', m: r(lerp(13000, 14000, t) * load) },
    { dow: 2, discipline: 'bike', title: 'Sweet-spot ride', target: '4 × 15 min just under threshold', m: r(lerp(55000, 60000, t) * load) },
    { dow: 3, discipline: 'swim', title: 'Open water', target: 'Wetsuit, sighting, mass starts', m: r(lerp(3200, 3800, t) * load) },
    { dow: 3, discipline: 'run', title: 'Easy run', target: 'Recovery pace', m: r(lerp(10000, 11000, t) * load) },
    { dow: 4, discipline: 'strength', title: 'Gym', target: 'Maintenance only', s: 2400 },
    { dow: 5, discipline: 'bike', title: 'Long ride', target: 'Race effort in the last 90 min', m: r(lerp(140000, 150000, t) * load) },
    { dow: 5, discipline: 'run', title: 'Brick run', target: 'Off the bike, race pace', m: r(lerp(8000, 10000, t) * load) },
    { dow: 6, discipline: 'run', title: 'Long run', target: 'Steady, controlled', m: r(lerp(20000, 22000, t) * load) },
  ];
}

function taperWeek(week) {
  // Volume falls, sharpness stays. The work is already done.
  if (week === 38) {
    return [
      { dow: 0, discipline: 'swim', title: 'Race-pace swim', target: '3 × 500 m at race effort', m: 3000 },
      { dow: 1, discipline: 'run', title: 'Race-pace intervals', target: '4 × 8 min at 70.3 effort', m: 11000 },
      { dow: 2, discipline: 'bike', title: 'Sweet-spot ride', target: '3 × 12 min', m: 45000 },
      { dow: 3, discipline: 'swim', title: 'Open water', target: 'Last proper one', m: 2800 },
      { dow: 4, discipline: 'strength', title: 'Gym', target: 'Light', s: 1800 },
      { dow: 5, discipline: 'bike', title: 'Long ride', target: '100 km, steady', m: 100000 },
      { dow: 5, discipline: 'run', title: 'Brick run', target: '6 km off the bike', m: 6000 },
      { dow: 6, discipline: 'run', title: 'Long run', target: '16 km, easy', m: 16000 },
    ];
  }

  if (week === 39) {
    return [
      { dow: 0, discipline: 'swim', title: 'Race-pace swim', target: '4 × 300 m at race effort', m: 2400 },
      { dow: 1, discipline: 'run', title: 'Sharpeners', target: '5 × 4 min at race effort', m: 9000 },
      { dow: 2, discipline: 'bike', title: 'Openers', target: '2 × 12 min at race effort', m: 35000 },
      { dow: 3, discipline: 'swim', title: 'Easy swim', target: 'Feel, not fitness', m: 2000 },
      { dow: 5, discipline: 'bike', title: 'Steady ride', target: '60 km, comfortable', m: 60000 },
      { dow: 6, discipline: 'run', title: 'Long run', target: '12 km, easy', m: 12000 },
    ];
  }

  // Race week.
  return [
    { dow: 0, discipline: 'swim', title: 'Loosener swim', target: '1.5 km, easy', m: 1500 },
    { dow: 1, discipline: 'run', title: 'Strides', target: '5 km + 6 × 20 s at race pace', m: 5000 },
    { dow: 2, discipline: 'bike', title: 'Openers', target: '40 min with 3 × 3 min at race effort', s: 2400 },
    { dow: 3, discipline: 'swim', title: 'Shakeout swim', target: '1 km, easy. Travel day.', m: 1000 },
    { dow: 4, discipline: 'bike', title: 'Course spin', target: '30 min, check the bike over', s: 1800 },
    { dow: 5, discipline: 'run', title: 'Shakeout', target: '3 km + 4 × 20 s. Rack the bike.', m: 3000 },
    { dow: 6, discipline: 'swim', title: 'Ironman 70.3 Málaga — swim', target: '1.9 km. Steady, find your feet.', m: 1900 },
    { dow: 6, discipline: 'bike', title: 'Ironman 70.3 Málaga — bike', target: '90 km. Eat every 30 minutes.', m: 90000 },
    { dow: 6, discipline: 'run', title: 'Ironman 70.3 Málaga — run', target: '21.1 km. This is the bit you trained for.', m: 21097 },
  ];
}

/** Round to something a person would actually write down. */
function r(value) {
  const n = Math.round(value);
  return n >= 10000 ? Math.round(n / 500) * 500 : Math.round(n / 100) * 100;
}

// ------------------------------------------------------------------ build

const BUILDERS = {
  seville: sevilleWeek,
  recover: recoverWeek,
  base: baseWeek,
  build: buildWeek,
  peak: peakWeek,
  taper: taperWeek,
};

const rows = [];
const summary = [];

for (let week = 1; week <= 40; week += 1) {
  const phase = phaseOf(week);
  const span = phase.to - phase.from;
  const weekInPhase = week - phase.from + 1;
  const t = span === 0 ? 1 : (weekInPhase - 1) / span;
  const load = phase.name === 'taper' || phase.name === 'recover' ? 1 : loadFor(weekInPhase);

  const sessions = BUILDERS[phase.name](week, t, load);
  const totals = { swim: 0, bike: 0, run: 0, seconds: 0 };

  for (const s of sessions) {
    if (s.m && totals[s.discipline] !== undefined) totals[s.discipline] += s.m;
    if (s.s) totals.seconds += s.s;
    rows.push({
      date: dateOf(week, s.dow),
      person: 'both',
      discipline: s.discipline,
      title: s.title,
      target: s.target,
      distance_m: s.m ?? '',
      duration_s: s.s ?? '',
      phase: phase.name,
      week,
    });
  }

  summary.push({ week, phase: phase.name, start: dateOf(week, 0), ...totals, sessions: sessions.length });
}

// Race day has to be the last day of the plan, or the arithmetic is wrong.
const lastDate = rows[rows.length - 1].date;
if (lastDate !== RACE_DAY) {
  console.error(`Plan ends ${lastDate}, expected race day ${RACE_DAY}. Check PLAN_START.`);
  process.exit(1);
}

if (process.argv.includes('--summary')) {
  console.log('week  phase    starting     swim     bike      run   by time  sessions');
  for (const w of summary) {
    console.log(
      String(w.week).padStart(4),
      w.phase.padEnd(8),
      w.start,
      `${(w.swim / 1000).toFixed(1)} km`.padStart(8),
      `${(w.bike / 1000).toFixed(0)} km`.padStart(8),
      `${(w.run / 1000).toFixed(1)} km`.padStart(8),
      `${(w.seconds / 3600).toFixed(1)} h`.padStart(9),
      String(w.sessions).padStart(9),
    );
  }
  const totals = summary.reduce(
    (acc, w) => ({ swim: acc.swim + w.swim, bike: acc.bike + w.bike, run: acc.run + w.run }),
    { swim: 0, bike: 0, run: 0 },
  );
  console.log(
    `\nAcross 40 weeks: ${(totals.swim / 1000).toFixed(0)} km swimming, ` +
      `${(totals.bike / 1000).toFixed(0)} km riding, ${(totals.run / 1000).toFixed(0)} km running, ` +
      `${rows.length} sessions each.`,
  );
} else {
  const escape = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  console.log('date,person,discipline,title,target,distance_m,duration_s,phase,week');
  for (const row of rows) {
    console.log(
      [row.date, row.person, row.discipline, row.title, row.target, row.distance_m, row.duration_s, row.phase, row.week]
        .map(escape)
        .join(','),
    );
  }
}
