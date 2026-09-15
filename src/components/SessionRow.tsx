'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { activityLine, DISCIPLINE_LABEL } from '@/lib/format';
import { Tick, Cross, Dot } from './icons';
import type { SessionWithActivity } from '@/lib/types';

/**
 * One planned session. Strava usually ticks these itself; the button is for
 * the times you trained without a watch, or Strava got it wrong.
 */
export function SessionRow({ session, isToday }: { session: SessionWithActivity; isToday: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(session.status);

  async function cycle() {
    const next = status === 'done' ? 'planned' : 'done';
    setStatus(next);

    await supabaseBrowser()
      .from('sessions')
      .update({
        status: next,
        completed_at: next === 'done' ? new Date().toISOString() : null,
        // Ticking it by hand means it is no longer Strava's claim.
        matched_automatically: false,
      })
      .eq('id', session.id);

    startTransition(() => router.refresh());
  }

  const label =
    status === 'done' ? 'Done. Tap to un-tick.' : 'Not done yet. Tap to tick it off.';

  return (
    <div className="sess">
      <span className="stripe" style={{ background: `var(--${session.discipline})` }} />
      <div>
        <p className="title">
          {session.title}
          <span className="disc" style={{ color: `var(--${session.discipline})` }}>
            {DISCIPLINE_LABEL[session.discipline]}
          </span>
        </p>
        {session.target && <p className="target">{session.target}</p>}

        {status === 'done' && session.activity && (
          <p className="proof">{activityLine(session.activity)}</p>
        )}
        {status === 'done' && !session.activity && (
          <p className="proof">Ticked off by hand</p>
        )}
        {status === 'missed' && <p className="proof bad">Nothing on Strava for this one</p>}
      </div>

      <button
        type="button"
        onClick={cycle}
        disabled={pending}
        aria-label={label}
        title={label}
        className={
          status === 'done' ? 'mark done' : status === 'missed' ? 'mark missed' : isToday ? 'mark now' : 'mark'
        }
      >
        {status === 'done' && <Tick />}
        {status === 'missed' && <Cross />}
        {status === 'planned' && isToday && <Dot />}
      </button>
    </div>
  );
}
