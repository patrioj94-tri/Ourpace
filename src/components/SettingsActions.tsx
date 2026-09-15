'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');

  async function sync() {
    setState('working');
    await fetch('/api/strava/sync?days=30');
    setState('done');
    router.refresh();
  }

  return (
    <button className="btn ghost" onClick={sync} disabled={state === 'working'}>
      {state === 'working' ? 'Checking Strava…' : state === 'done' ? 'Up to date' : 'Check Strava now'}
    </button>
  );
}

export function SignOut() {
  const router = useRouter();

  async function out() {
    await supabaseBrowser().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button className="btn ghost" onClick={out}>
      Sign out
    </button>
  );
}
