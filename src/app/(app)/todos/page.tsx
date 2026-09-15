import { supabaseServer } from '@/lib/supabase/server';
import { TodoList } from '@/components/TodoList';
import type { Profile, Todo } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TodosPage() {
  const supabase = await supabaseServer();

  const [{ data: { user } }, { data: profiles }, { data: todos }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('profiles').select('*').order('short_name'),
    supabase.from('todos').select('*').order('done').order('position').order('created_at'),
  ]);

  return (
    <>
      <p className="eyebrow">Shared list</p>
      <h2>Things we need to do</h2>
      <p className="sub">Tap to tick. Whoever does it, the other one sees it straight away.</p>
      <TodoList
        initial={(todos ?? []) as Todo[]}
        people={(profiles ?? []) as Profile[]}
        me={user?.id ?? ''}
      />
    </>
  );
}
