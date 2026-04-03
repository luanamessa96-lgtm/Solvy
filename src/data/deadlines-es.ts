import { calculateRETA } from '../lib/countries/es';

export interface FiscalDeadline {
  title: string;
  date: string; // YYYY-MM-DD format
  amount?: number;
  type: string;
}

export interface SpanishDeadlinesOptions {
  redditoN1?: number | null;
  annoInizioAttivita?: number | null;
}

function nextBusinessDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 6) d.setDate(d.getDate() + 2);
  else if (day === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number): string {
  // month: 0-based (0=Jan, 11=Dec). Day 0 of next month = last day of current month.
  const d = new Date(year, month + 1, 0);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const RETA_TITLE = 'Cuota RETA \u2014 Seguridad Social';

export function getSpanishDeadlines(year: number, options?: SpanishDeadlinesOptions): FiscalDeadline[] {
  return [
    // Modelo 303+130 — quarterly IVA + IRPF
    { title: 'Modelo 303+130 — T1', date: `${year}-04-20`, type: 'trimestral' },
    { title: 'Modelo 303+130 — T2', date: `${year}-07-20`, type: 'trimestral' },
    { title: 'Modelo 303+130 — T3', date: `${year}-10-20`, type: 'trimestral' },
    { title: 'Modelo 303+130 — T4', date: nextBusinessDay(`${year + 1}-01-30`), type: 'trimestral' },
    // Annual declarations
    { title: 'Modelo 390 — Resumen anual IVA', date: `${year + 1}-01-30`, type: 'annuale' },
    { title: 'Modelo 100 — Renta anual', date: `${year}-06-30`, type: 'annuale' },
  ];
}

/** Returns the next monthly RETA deadline (last day of current or next month) with amount. */
export function getNextRetaDeadline(options?: SpanishDeadlinesOptions): { date: string; amount: number } {
  const annoInicio = options?.annoInizioAttivita;
  const redditoN1 = options?.redditoN1;
  const currentYear = new Date().getFullYear();

  let amount = 80;
  if (annoInicio != null && annoInicio === currentYear) {
    amount = 80;
  } else if (redditoN1 != null && redditoN1 > 0) {
    amount = calculateRETA(redditoN1 / 12);
  }

  // Find next last-day-of-month from today
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  const candidate = lastDayOfMonth(year, month);
  const candidateDate = new Date(candidate + 'T23:59:59');
  const date = candidateDate >= today
    ? candidate
    : lastDayOfMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);

  return { date, amount };
}
