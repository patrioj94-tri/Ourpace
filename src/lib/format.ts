import type { Activity, Discipline } from './types';

export function km(metres: number | null | undefined, digits = 2): string {
  if (!metres) return '—';
  return `${(metres / 1000).toFixed(digits)} km`;
}

export function clock(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Minutes and seconds per kilometre, the way a runner reads it. */
export function pacePerKm(metres: number, seconds: number): string {
  if (!metres || !seconds) return '—';
  const perKm = seconds / (metres / 1000);
  return `${clock(perKm)} /km`;
}

/** Swimmers count in hundreds, not kilometres. */
export function pacePer100m(metres: number, seconds: number): string {
  if (!metres || !seconds) return '—';
  return `${clock(seconds / (metres / 100))} /100 m`;
}

export function kmh(metresPerSecond: number | null | undefined): string {
  if (!metresPerSecond) return '—';
  return `${(metresPerSecond * 3.6).toFixed(1)} km/h`;
}

/** The one line of proof under a ticked-off session. */
export function activityLine(a: Activity): string {
  const bits: string[] = ['Strava'];
  const d = a.distance_m ?? 0;
  const t = a.moving_time_s ?? 0;

  if (a.discipline === 'strength' || !d) {
    bits.push(clock(t));
  } else {
    bits.push(km(d));
    bits.push(clock(t));
    if (a.discipline === 'run') bits.push(pacePerKm(d, t));
    else if (a.discipline === 'swim') bits.push(pacePer100m(d, t));
    else if (a.discipline === 'bike') bits.push(kmh(a.avg_speed));
  }
  if (a.elevation_m && a.elevation_m > 100) bits.push(`${Math.round(a.elevation_m)} m up`);
  return bits.join(' · ');
}

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  swim: 'Swim',
  bike: 'Bike',
  run: 'Run',
  strength: 'Strength',
  rest: 'Rest',
  other: 'Other',
};
