#!/usr/bin/env node
/**
 * Loads a training plan from CSV into the sessions table.
 *
 *   node scripts/load-plan.mjs plans/half-ironman-malaga.csv
 *   node scripts/load-plan.mjs plans/week-one.csv --replace
 *
 * Columns: date, person, discipline, title, target, distance_m, duration_s, phase, week
 *   date        YYYY-MM-DD
 *   person      short_name as it appears in profiles (Patri, Jean) or "both"
 *   discipline  swim | bike | run | strength | rest | other
 *   target      free text shown under the title ("6 × 800 m @ 4:15 /km")
 *   distance_m  optional, but it is what makes automatic matching accurate
 *   duration_s  optional, used when a session has no distance
 *
 * --replace clears existing sessions inside the CSV's date range first.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const [, , file, ...flags] = process.argv;
if (!file) {
  console.error('Usage: node scripts/load-plan.mjs <plan.csv> [--replace]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** Minimal CSV reader: handles quoted fields with commas, which titles often have. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }

  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const rows = parseCSV(readFileSync(file, 'utf8'));
const header = rows.shift().map((h) => h.trim().toLowerCase());
const records = rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));

const { data: profiles, error: profileError } = await db.from('profiles').select('id, short_name');
if (profileError) { console.error(profileError.message); process.exit(1); }
if (!profiles.length) {
  console.error('No profiles yet — both of you need to sign in once before loading a plan.');
  process.exit(1);
}

const byName = new Map(profiles.map((p) => [p.short_name.toLowerCase(), p.id]));

const sessions = [];
for (const [index, record] of records.entries()) {
  const line = index + 2;
  if (!record.date || !record.discipline || !record.title) {
    console.error(`Line ${line}: needs at least date, discipline and title.`);
    process.exit(1);
  }

  const whose = (record.person || 'both').toLowerCase();
  const targets =
    whose === 'both' || whose === 'us' ? profiles.map((p) => p.id) : [byName.get(whose)];

  if (targets.some((t) => !t)) {
    console.error(`Line ${line}: no profile called "${record.person}". Known: ${[...byName.keys()].join(', ')}`);
    process.exit(1);
  }

  for (const profileId of targets) {
    sessions.push({
      profile_id: profileId,
      date: record.date,
      discipline: record.discipline.toLowerCase(),
      title: record.title,
      target: record.target || null,
      target_distance_m: record.distance_m ? Number(record.distance_m) : null,
      target_duration_s: record.duration_s ? Number(record.duration_s) : null,
      phase: record.phase || null,
      week_number: record.week ? Number(record.week) : null,
      position: index,
    });
  }
}

const dates = sessions.map((s) => s.date).sort();
const from = dates[0];
const to = dates[dates.length - 1];

if (flags.includes('--replace')) {
  const { error } = await db.from('sessions').delete().gte('date', from).lte('date', to);
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Cleared existing sessions between ${from} and ${to}.`);
}

const { error } = await db.from('sessions').insert(sessions);
if (error) { console.error(error.message); process.exit(1); }

console.log(`Loaded ${sessions.length} sessions for ${profiles.length} people, ${from} to ${to}.`);
