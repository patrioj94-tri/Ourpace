import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SignOut, SyncButton } from '@/components/SettingsActions';
import { longDate } from '@/lib/dates';
import type { Profile, Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const { strava } = await searchParams;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profiles }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('*').order('short_name'),
    supabase.from('settings').select('*').single(),
  ]);

  // Which connections exist is server-only knowledge — the tokens themselves
  // are never readable from the browser.
  const admin = supabaseAdmin();
  const [{ data: stravaRows }, { data: googleRows }] = await Promise.all([
    admin.from('strava_accounts').select('profile_id, last_synced_at'),
    admin.from('google_accounts').select('profile_id'),
  ]);

  const hasStrava = new Map((stravaRows ?? []).map((r) => [r.profile_id, r.last_synced_at]));
  const hasGoogle = new Set((googleRows ?? []).map((r) => r.profile_id));
  const me = (profiles ?? []).find((p) => p.id === user?.id) as Profile | undefined;
  const race = settings as Settings | null;

  return (
    <>
      <p className="eyebrow">Settings</p>
      <h2>Connections</h2>

      {strava === 'connected' && (
        <p className="sub" style={{ color: 'var(--ok)', marginTop: 10 }}>
          Strava connected. Your recent activities are on their way in.
        </p>
      )}
      {strava === 'failed' && (
        <p className="sub" style={{ color: 'var(--miss)', marginTop: 10 }}>
          Strava would not connect. Try again?
        </p>
      )}

      <div style={{ marginTop: 14 }}>
        {(profiles ?? []).map((p) => (
          <div className="setting" key={p.id}>
            <span
              className="who"
              style={{
                color: `var(--${p.color})`,
                background: `color-mix(in srgb, var(--${p.color}) 13%, transparent)`,
              }}
            >
              {p.short_name}
            </span>
            <div className="txt">
              <b>{hasStrava.has(p.id) ? 'Strava connected' : 'Strava not connected'}</b>
              <span>
                {hasGoogle.has(p.id) ? 'Calendar connected' : 'Calendar not connected'}
                {hasStrava.get(p.id)
                  ? ` · last checked ${new Date(hasStrava.get(p.id)!).toLocaleString()}`
                  : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {me && !hasStrava.has(me.id) && (
        <a className="btn" href="/api/strava/connect" style={{ display: 'block', textAlign: 'center', marginTop: 16, textDecoration: 'none' }}>
          Connect {me.short_name}&apos;s Strava
        </a>
      )}

      <h2 style={{ marginTop: 28 }}>The race</h2>
      {race && (
        <p className="sub" style={{ marginTop: 8 }}>
          {race.race_name} — {longDate(race.race_date)}
          {race.race_location ? `, ${race.race_location}` : ''}.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        <SyncButton />
        <SignOut />
      </div>

      <p className="note">
        Your watches sync to Strava on their own, and Our Pace reads Strava — so there is
        nothing to connect on the Garmin side.
      </p>
    </>
  );
}
