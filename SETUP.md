# Setting up Our Pace

About an hour, most of it waiting on other people's consent screens. Nothing
here costs money — Vercel and Supabase both stay on their free tiers at the
size of two people.

Work through it in order; each step needs the one before it.

---

## 1. Supabase — the database

1. Create a project at [supabase.com](https://supabase.com). Pick the **Frankfurt**
   region — it's the closest to Belgium.
2. Open the **SQL Editor** and run, in this order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed.sql` — **edit Jean's email address first.** That file is the
     only thing that decides who can get in.
3. From **Project Settings → API**, copy three values into `.env.local`
   (start by copying `.env.example`):
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

The service-role key bypasses every security rule in the database. It belongs in
server environment variables and nowhere else — never in the browser, never in a
commit.

---

## 2. Google — sign-in and calendars

One Google app covers both jobs: proving who you are, and reading the calendars.

1. In the [Google Cloud console](https://console.cloud.google.com), create a
   project and enable the **Google Calendar API**.
2. **APIs & Services → OAuth consent screen**: choose *External*, fill in the
   basics, and add both of your Gmail addresses as **test users**. You do not
   need to publish the app or pass verification — test users work indefinitely.
3. **Credentials → Create OAuth client ID → Web application**. Add these
   authorised redirect URIs:
   - `https://<your-project>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`
   - `https://<your-domain>/auth/callback`
4. Copy the client ID and secret into `.env.local` as `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`.
5. Back in Supabase: **Authentication → Providers → Google**. Turn it on and
   paste the same client ID and secret.

Now sign in once with each account. Signing in creates the profile, and hands
the app the token it needs to read that person's calendar. Anyone not in
`allowed_emails` is turned away at the door.

---

## 3. Strava — where the training comes from

**Garmin needs no setup.** Garmin Connect already pushes every activity to
Strava within seconds, and Our Pace reads Strava. Garmin's own API is closed to
projects like this one, so going through Strava is not a compromise — it is the
route that works.

1. Both of you: connect your Garmin account to Strava once, at
   [Garmin Connect → Settings → Connected Apps](https://connect.garmin.com).
2. Create an API application at
   [strava.com/settings/api](https://www.strava.com/settings/api):
   - *Authorization Callback Domain*: `localhost` while developing, then your
     real domain.
   - Copy the client ID and secret into `.env.local`.
3. Invent any random string for `STRAVA_WEBHOOK_VERIFY_TOKEN`.
4. Once deployed, register the webhook so activities arrive by themselves:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=$STRAVA_CLIENT_ID \
  -F client_secret=$STRAVA_CLIENT_SECRET \
  -F callback_url=https://<your-domain>/api/strava/webhook \
  -F verify_token=$STRAVA_WEBHOOK_VERIFY_TOKEN
```

Strava immediately calls the URL back to check it's really yours, so deploy
before running this. After that, finishing a session marks it done on its own,
usually before you've taken your shoes off.

The scope is `activity:read_all`, so private activities count too.

---

## 4. Claude — the Sunday note (optional)

Get a key from [console.anthropic.com](https://console.anthropic.com) and set
`ANTHROPIC_API_KEY`. Without it the app works fine; you just don't get the
weekly note. It runs once a week on a short prompt, so it costs a few cents a
month.

Set `CRON_SECRET` to any random string. Vercel sends it automatically on
scheduled jobs, and the jobs refuse to run without it.

---

## 5. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in.

---

## 6. Deploy

1. Push to GitHub, then import the repo at [vercel.com](https://vercel.com).
2. Add every variable from `.env.example` in **Settings → Environment Variables**.
   Set `NEXT_PUBLIC_SITE_URL` to the real domain.
3. Deploy. `vercel.json` sets up three scheduled jobs automatically:
   - **03:00 daily** — close off sessions nobody did
   - **03:30 daily** — re-check Strava, in case a webhook went missing
   - **19:00 Sunday** — write the weekly note
4. Go back and add the production URLs to the Google and Strava settings above,
   then register the Strava webhook.

### Putting it on his phone

Open the site in Safari → Share → **Add to Home Screen**. It gets an icon, opens
fullscreen, and there is nothing to say it isn't an app from the App Store.
Same on Android via Chrome's menu.

---

## 7. Load the training plan

Sessions come from a CSV so you can use a real half-Ironman plan rather than
anything invented:

```bash
node scripts/load-plan.mjs plans/example-week.csv
```

See `plans/example-week.csv` for the columns. `person` takes `Patri`, `Jean` or
`both`. Filling in `distance_m` is what makes the automatic ticking accurate —
without it the matcher falls back to the date and the sport alone.

Pass `--replace` to clear the date range first, for when a plan changes.

---

## How the automatic ticking actually works

1. A watch finishes a session and syncs to Strava.
2. Strava calls `/api/strava/webhook`.
3. The app fetches the activity and stores it.
4. `src/lib/match.ts` looks for a planned session for that person, same sport,
   within a day either side, and scores how well the distance or duration lines
   up. Above 65 out of 100 it's ticked off; below that it's left open.

This is deliberately arithmetic and not a language model. "Did we do the
Thursday run" has a right answer, and arithmetic doesn't invent one. Claude is
used for the weekly note, where the judgement is about tone rather than fact.

If Strava is wrong, or you trained without a watch, tap the circle on any
session to tick it by hand.
