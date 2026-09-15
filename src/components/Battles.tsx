'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { shortDate } from '@/lib/dates';
import type { Battle, Game, Profile } from '@/lib/types';

export function Battles({
  games,
  battles: initial,
  people,
  me,
}: {
  games: Game[];
  battles: Battle[];
  people: Profile[];
  me: string;
}) {
  const [battles, setBattles] = useState(initial);
  const [name, setName] = useState('');
  const [list, setList] = useState(games);
  const supabase = supabaseBrowser();

  const totals = useMemo(() => {
    const counts = new Map<string, number>(people.map((p) => [p.id, 0]));
    battles.forEach((b) => counts.set(b.winner_id, (counts.get(b.winner_id) ?? 0) + 1));
    return counts;
  }, [battles, people]);

  async function logWin(gameId: string, winnerId: string) {
    const optimistic: Battle = {
      id: `temp-${Date.now()}`,
      game_id: gameId,
      winner_id: winnerId,
      played_on: new Date().toISOString().slice(0, 10),
      note: null,
    };
    setBattles((all) => [optimistic, ...all]);

    const { data } = await supabase
      .from('battles')
      .insert({ game_id: gameId, winner_id: winnerId, created_by: me })
      .select()
      .single();

    if (data) {
      setBattles((all) => all.map((b) => (b.id === optimistic.id ? (data as Battle) : b)));
    }
  }

  async function addGame(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setName('');
    const { data } = await supabase.from('games').insert({ name: trimmed }).select().single();
    if (data) setList((all) => [...all, data as Game]);
  }

  const [a, b] = people;
  const leader =
    !a || !b
      ? null
      : (totals.get(a.id) ?? 0) === (totals.get(b.id) ?? 0)
        ? 'Dead level.'
        : (totals.get(a.id) ?? 0) > (totals.get(b.id) ?? 0)
          ? `${a.short_name} leads by ${(totals.get(a.id) ?? 0) - (totals.get(b.id) ?? 0)}.`
          : `${b.short_name} leads by ${(totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0)}.`;

  return (
    <>
      {a && b && (
        <div className="score" style={{ marginTop: 14 }}>
          <div>
            <div className="n" style={{ color: `var(--${a.color})` }}>
              {totals.get(a.id) ?? 0}
            </div>
            <span className="nm">{a.short_name}</span>
          </div>
          <div className="vs">vs</div>
          <div>
            <div className="n" style={{ color: `var(--${b.color})` }}>
              {totals.get(b.id) ?? 0}
            </div>
            <span className="nm">{b.short_name}</span>
          </div>
        </div>
      )}

      {leader && (
        <p className="sub" style={{ marginTop: 12 }}>
          {leader} {battles.length} games logged.
        </p>
      )}

      <div style={{ marginTop: 8 }}>
        {list.map((game) => {
          const played = battles
            .filter((x) => x.game_id === game.id)
            .sort((x, y) => y.played_on.localeCompare(x.played_on));
          const last = played[0];
          const lastName = last ? people.find((p) => p.id === last.winner_id)?.short_name : null;

          return (
            <div className="game" key={game.id}>
              <div>
                <b>
                  {game.emoji ? `${game.emoji} ` : ''}
                  {game.name}
                </b>
                <span className="last">
                  {last ? `Last: ${lastName}, ${shortDate(last.played_on)}` : 'Never played'}
                </span>
              </div>
              {/* Mirrored, so each + sits on its own player's side — the same
                  way round as the scoreboard at the top of the page. */}
              <div className="tally">
                {a && (
                  <button
                    type="button"
                    onClick={() => logWin(game.id, a.id)}
                    aria-label={`${a.short_name} won at ${game.name}`}
                    title={`${a.short_name} won`}
                    style={{ color: `var(--${a.color})` }}
                  >
                    +
                  </button>
                )}
                {a && (
                  <span className="v" style={{ color: `var(--${a.color})` }}>
                    {played.filter((x) => x.winner_id === a.id).length}
                  </span>
                )}
                <span className="sep">–</span>
                {b && (
                  <span className="v" style={{ color: `var(--${b.color})` }}>
                    {played.filter((x) => x.winner_id === b.id).length}
                  </span>
                )}
                {b && (
                  <button
                    type="button"
                    onClick={() => logWin(game.id, b.id)}
                    aria-label={`${b.short_name} won at ${game.name}`}
                    title={`${b.short_name} won`}
                    style={{ color: `var(--${b.color})` }}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form className="addrow" onSubmit={addGame} style={{ marginTop: 18 }}>
        <input
          id="new-game"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a game"
          aria-label="New game"
        />
        <button className="btn" type="submit" disabled={!name.trim()}>
          Add
        </button>
      </form>
    </>
  );
}
