'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrainingIcon, CalendarIcon, TodoIcon, DreamIcon, BattleIcon } from './icons';

const TABS = [
  { href: '/', label: 'Training', Icon: TrainingIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/todos', label: 'To-do', Icon: TodoIcon },
  { href: '/dreams', label: 'Dreams', Icon: DreamIcon },
  { href: '/battles', label: 'Battles', Icon: BattleIcon },
];

export function TabBar() {
  const path = usePathname();

  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link key={href} href={href} data-active={active} aria-current={active ? 'page' : undefined}>
            <Icon />
            <span className="lbl">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
