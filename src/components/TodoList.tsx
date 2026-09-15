'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { shortDate } from '@/lib/dates';
import { Tick } from './icons';
import type { Profile, Todo } from '@/lib/types';

export function TodoList({
  initial,
  people,
  me,
}: {
  initial: Todo[];
  people: Profile[];
  me: string;
}) {
  const [todos, setTodos] = useState(initial);
  const [draft, setDraft] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const supabase = supabaseBrowser();

  // Tick something on one phone, watch it tick on the other.
  useEffect(() => {
    const channel = supabase
      .channel('todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, async () => {
        const { data } = await supabase
          .from('todos')
          .select('*')
          .order('done')
          .order('position')
          .order('created_at');
        if (data) setTodos(data as Todo[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function toggle(todo: Todo) {
    const done = !todo.done;
    setTodos((list) => list.map((t) => (t.id === todo.id ? { ...t, done } : t)));
    await supabase
      .from('todos')
      .update({ done, done_by: done ? me : null, done_at: done ? new Date().toISOString() : null })
      .eq('id', todo.id);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setDraft('');
    const { data } = await supabase
      .from('todos')
      .insert({ body, assignee_id: assignee || null, created_by: me })
      .select()
      .single();

    if (data) setTodos((list) => [...list, data as Todo]);
  }

  const nameOf = (id: string | null) =>
    id ? (people.find((p) => p.id === id)?.short_name ?? '?') : 'Us';
  const colorOf = (id: string | null) =>
    id ? (people.find((p) => p.id === id)?.color ?? 'other') : 'accent';

  return (
    <>
      <form className="addrow" onSubmit={add}>
        <input
          id="new-todo"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Something we need to do"
          aria-label="New to-do"
        />
        <select
          id="new-todo-assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          aria-label="Who it's for"
          style={{ flex: '0 0 92px' }}
        >
          <option value="">Us</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.short_name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>

      {todos.length === 0 && <div className="empty" style={{ marginTop: 16 }}>Nothing on the list. Enjoy it.</div>}

      <div style={{ marginTop: 10 }}>
        {todos.map((todo) => (
          <div className="todo" data-done={todo.done} key={todo.id}>
            <button
              type="button"
              className="box"
              onClick={() => toggle(todo)}
              aria-label={todo.done ? `Un-tick ${todo.body}` : `Tick off ${todo.body}`}
            >
              {todo.done && <Tick />}
            </button>
            <div className="tx">
              <b>{todo.body}</b>
              <span>
                {todo.due_on ? shortDate(todo.due_on) : 'No date'}
                {todo.done && todo.done_by ? ` · done by ${nameOf(todo.done_by)}` : ''}
              </span>
            </div>
            <span
              className="who"
              style={{
                color: `var(--${colorOf(todo.assignee_id)})`,
                background: `color-mix(in srgb, var(--${colorOf(todo.assignee_id)}) 13%, transparent)`,
              }}
            >
              {nameOf(todo.assignee_id)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
