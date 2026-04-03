export interface FiscalDeadline {
  title: string;
  date: string; // YYYY-MM-DD format
  amount?: number;
  type: string;
}
import { calculateRETA } from '../lib/countries/es';

export interface SpanishDeadlinesOptions {
  redditoN1?: number | null;
  annoInizioAttivita?: number | null;
}

/** Last day of month (month: 0-based). */
function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month + 1, 0);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns the next monthly RETA deadline (last day of current or next month) with computed amount. */
export function getNextRetaDeadline(options?: SpanishDeadlinesOptions): { date: string; amount: number } {
  const annoInicio = options?.annoInizioAttivita;
  const redditoN1 = options?.redditoN1;
  const currentYear = new Date().getFullYear();

  let amount = 80;
  if (annoInicio == null || annoInicio !== currentYear) {
    if (redditoN1 != null && redditoN1 > 0) {
      amount = calculateRETA(redditoN1 / 12);
    }
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const candidate = lastDayOfMonth(year, month);
  const isAfterToday = new Date(candidate + 'T23:59:59') >= today;
  const date = isAfterToday
    ? candidate
    : lastDayOfMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);

  return { date, amount };
}

export function getSpanishDeadlines(year: number): FiscalDeadline[] {
  return [
    // Modelo 303+130 — quarterly IVA + IRPF
    { title: 'Modelo 303+130 — T1', date: `${year}-04-20`, type: 'trimestral' },
    { title: 'Modelo 303+130 — T2', date: `${year}-07-20`, type: 'trimestral' },
    { title: 'Modelo 303+130 — T3', date: `${year}-10-20`, type: 'trimestral' },
    { title: 'Modelo 303+130 — T4', date: `${year + 1}-01-30`, type: 'trimestral' },
    // Annual declarations
    { title: 'Modelo 390 — Resumen anual IVA', date: `${year + 1}-01-30`, type: 'annuale' },
    { title: 'Modelo 100 — Renta anual', date: `${year}-06-30`, type: 'annuale' },
  ];
}
