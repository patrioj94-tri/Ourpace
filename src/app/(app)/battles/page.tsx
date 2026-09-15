import { supabaseServer } from '@/lib/supabase/server';
import { Battles } from '@/components/Battles';
import type { Battle, Game, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BattlesPage() {
  const supabase = await supabaseServer();

  const [{ data: { user } }, { data: profiles }, { data: games }, { data: battles }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('*').order('short_name'),
      supabase.from('games').select('*').order('name'),
      supabase.from('battles').select('*').order('played_on', { ascending: false }),
    ]);

  return (
    <>
      <p className="eyebrow">Head to head</p>
      <h2>Game battles</h2>
      <Battles
        games={(games ?? []) as Game[]}
        battles={(battles ?? []) as Battle[]}
        people={(profiles ?? []) as Profile[]}
        me={user?.id ?? ''}
      />
    </>
  );
}
