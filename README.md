# Our Pace

A private app for two people: a shared half-Ironman training block that ticks
itself off from Strava, both calendars in one week view, a to-do list, a place
to keep the things we said we'd do one day, and a running tally of who wins at
what.

Built for Patri and Jean, and for **Ironman 70.3 Málaga**.

## What's in it

| | |
|---|---|
| **Training** | The week's sessions for both of you. Finish one and Strava ticks it off before you get home. Days to race, always visible. |
| **Calendar** | Both Google calendars merged into one week, with the training laid over the top. |
| **To-do** | Shared, assignable, live — tick it on one phone and it ticks on the other. |
| **Dreams** | Things we said we'd do one day. Each one walks from *someday* to *done*. |
| **Battles** | Every game we play and who won. |

## How it's built

- **Next.js** on **Vercel**, installable to a phone's home screen as a PWA
- **Supabase** for the database, sign-in and live sync between the two phones
- **Strava** for training data — Garmin syncs there already, so there is nothing
  to connect on the Garmin side
- **Google Calendar** for the shared week
- **Claude** writes the Sunday note, and nothing else: the session matching is
  plain arithmetic

Sign-in is restricted to two email addresses listed in the database. Everyone
else is turned away by a trigger on the users table.

## Getting it running

See **[SETUP.md](./SETUP.md)** — about an hour, mostly spent on other people's
consent screens. Nothing in it costs money.

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

## Layout

```
src/app/(app)/      the five sections
src/app/api/        Strava OAuth + webhook, calendar, scheduled jobs
src/lib/match.ts    decides whether an activity answers a planned session
src/lib/strava.ts   tokens, refresh, activities
supabase/           schema and seed data
scripts/load-plan.mjs   loads a training plan from CSV
```
