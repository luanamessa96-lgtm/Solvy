/**
 * Parses a date string (YYYY-MM-DD or ISO) in LOCAL time, avoiding the UTC
 * midnight offset bug: new Date("2026-04-01") = midnight UTC, which in UTC-X
 * timezones becomes March 31 locally. This utility always returns local midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  const s = dateStr.split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getLocalYear(dateStr: string): number {
  return parseLocalDate(dateStr).getFullYear();
}

export function getLocalMonth(dateStr: string): number {
  return parseLocalDate(dateStr).getMonth();
}
