'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Dream, DreamState } from '@/lib/types';

const STATES: DreamState[] = ['someday', 'planning', 'booked', 'done'];
const LABEL: Record<DreamState, string> = {
  someday: 'Someday',
  planning: 'Planning',
  booked: 'Booked',
  done: 'Done',
};

export function DreamBoard({ initial, me }: { initial: Dream[]; me: string }) {
  const [dreams, setDreams] = useState(initial);
  const [title, setTitle] = useState('');
  const supabase = supabaseBrowser();

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setTitle('');
    const { data } = await supabase
      .from('dreams')
      .insert({ title: trimmed, created_by: me })
      .select()
      .single();

    if (data) setDreams((list) => [data as Dream, ...list]);
  }

  /** Tapping the chip walks a dream one step closer to happening. */
  async function advance(dream: Dream) {
    const next = STATES[(STATES.indexOf(dream.state) + 1) % STATES.length];
    setDreams((list) => list.map((d) => (d.id === dream.id ? { ...d, state: next } : d)));
    await supabase.from('dreams').update({ state: next }).eq('id', dream.id);
  }

  return (
    <>
      <form className="addrow" onSubmit={add}>
        <input
          id="new-dream"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Something we said we'd do"
          aria-label="New dream"
        />
        <button className="btn" type="submit" disabled={!title.trim()}>
          Add
        </button>
      </form>

      {dreams.length === 0 && (
        <div className="empty" style={{ marginTop: 16 }}>
          Nothing here yet. Add the first one.
        </div>
      )}

      <div className="stack" style={{ marginTop: 16 }}>
        {dreams.map((dream) => (
          <article className="dream" key={dream.id}>
            <div className="dreamtop">
              <p className="eyebrow">{dream.category ?? 'Us'}</p>
              <button
                type="button"
                className={`chip ${dream.state}`}
                onClick={() => advance(dream)}
                aria-label={`${LABEL[dream.state]}. Tap to move it on.`}
              >
                {LABEL[dream.state]}
              </button>
            </div>
            <h3>{dream.title}</h3>
            {dream.note && <p>{dream.note}</p>}
            {dream.cost_estimate ? (
              <p style={{ marginTop: 8 }}>
                <span className="bar" style={{ display: 'block', marginBottom: 5 }}>
                  <i
                    style={{
                      width: `${Math.min(100, Math.round((dream.saved / dream.cost_estimate) * 100))}%`,
                      background: 'var(--ok)',
                    }}
                  />
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                  €{dream.saved} saved of €{dream.cost_estimate}
                </span>
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
