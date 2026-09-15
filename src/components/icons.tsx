type Props = { size?: number };

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function TrainingIcon({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M2 13h4l2.5-7 4 14 2.5-7H22" />
    </svg>
  );
}

export function CalendarIcon({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function TodoIcon({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M3.5 7l2 2 3.5-3.5M3.5 17l2 2 3.5-3.5M13 7.5h8M13 17.5h8" />
    </svg>
  );
}

export function DreamIcon({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9 6.7 19.7l1.1-5.9L3.5 9.7l5.9-.8z" />
    </svg>
  );
}

export function BattleIcon({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M8 21V10M16 21V10M5 10h14a7 7 0 01-7 7 7 7 0 01-7-7zM9 3h6v4H9zM5 10V7a2 2 0 012-2M19 10V7a2 2 0 00-2-2" />
    </svg>
  );
}

export function Tick({ size = 13, color = '#fff' }: Props & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

export function Cross({ size = 11 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={3} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Dot({ size = 8 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}
