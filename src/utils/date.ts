/**
 * Parses a date string (YYYY-MM-DD or ISO) in LOCAL time, avoiding the UTC
 * midnight offset bug: new Date("2026-04-01") = midnight UTC, which in UTC-X
 * timezones becomes March 31 locally. This utility always returns local midnight.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(0); // sentinel: won't match any real year/month filter
  const s = dateStr.split('T')[0];
  const parts = s.split('-').map(Number);
  // Guard against partial dates ("2026-04") or non-numeric parts
  if (parts.length < 3 || parts.some(isNaN)) return new Date(0);
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

export function getLocalYear(dateStr: string | null | undefined): number {
  return parseLocalDate(dateStr).getFullYear();
}

export function getLocalMonth(dateStr: string | null | undefined): number {
  return parseLocalDate(dateStr).getMonth();
}

/**
 * Returns today's date as a YYYY-MM-DD string in LOCAL time.
 * Avoids the UTC midnight bug of new Date().toISOString().split('T')[0],
 * which in UTC+1/+2 timezones (Spain, Italy) can return "yesterday" between
 * midnight and 01:00/02:00 local time.
 */
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
