import { supabaseServer } from '@/lib/supabase/server';
import { DreamBoard } from '@/components/DreamBoard';
import type { Dream } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DreamsPage() {
  const supabase = await supabaseServer();

  const [{ data: { user } }, { data: dreams }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('dreams').select('*').order('position').order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <p className="eyebrow">Let&apos;s dream together</p>
      <h2>Things we said we&apos;d do one day</h2>
      <p className="sub">
        No deadlines here. Just somewhere to keep them so they don&apos;t get lost in a chat.
      </p>
      <DreamBoard initial={(dreams ?? []) as Dream[]} me={user?.id ?? ''} />
    </>
  );
}
