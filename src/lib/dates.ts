/** Everything here works in plain YYYY-MM-DD strings, to dodge timezone drift. */

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Monday, because a training week starts on a Monday. */
export function weekStart(from: Date = new Date()): string {
  const d = new Date(from);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return toISODate(d);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysUntil(iso: string): number {
  const today = parseISODate(toISODate(new Date()));
  return Math.round((parseISODate(iso).getTime() - today.getTime()) / 86_400_000);
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayName(iso: string): string {
  return DOW[(parseISODate(iso).getDay() + 6) % 7];
}

export function shortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
}

export function longDate(iso: string): string {
  const d = parseISODate(iso);
  return `${dayName(iso)} ${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

export function isToday(iso: string): boolean {
  return iso === toISODate(new Date());
}

export function timeOfDay(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
