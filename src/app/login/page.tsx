'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const MESSAGES: Record<string, string> = {
  not_invited: 'That account is not on the list. Only the two of you can get in.',
  sign_in_failed: 'That did not work. Try again?',
  missing_code: 'Google sent us back without a code. Try again?',
};

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const error =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('error')
      : null;

  async function signIn() {
    setBusy(true);
    await supabaseBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Calendar scopes come along with sign-in, so there is only one
        // permission screen instead of two.
        scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }

  return (
    <div className="login">
      <div className="card">
        <h1>
          Our<span>&nbsp;Pace</span>
        </h1>
        <p>Training, plans and small competitions, for the two of us.</p>

        {error && (
          <p style={{ color: 'var(--miss)', marginBottom: 16 }}>
            {MESSAGES[error] ?? 'Something went wrong.'}
          </p>
        )}

        <button className="btn" onClick={signIn} disabled={busy} style={{ width: '100%' }}>
          {busy ? 'One moment…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
