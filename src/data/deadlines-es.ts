export interface FiscalDeadline {
  title: string;
  date: string; // YYYY-MM-DD format
  amount?: number;
  type: string;
}
import { calculateRETA, calculateGastosDificilJustificacion } from '../lib/countries/es';

export interface SpanishDeadlinesOptions {
  redditoN1?: number | null;
  annoInizioAttivita?: number | null;
  currentIncome?: number | null;
  savedRetaMensile?: number | null;
}

/** Last day of month (month: 0-based). */
function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month + 1, 0);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns the next monthly RETA deadline (last day of current or next month) with computed amount. */
export function getNextRetaDeadline(options?: SpanishDeadlinesOptions): { date: string; amount: number } {
  const redditoN1 = options?.redditoN1;
  const currentIncome = options?.currentIncome;
  const savedRetaMensile = options?.savedRetaMensile;

  // Priorità: savedRetaMensile (valore salvato dall'utente) → redditoN1 → currentIncome → minimo
  let amount: number;
  if (savedRetaMensile != null && savedRetaMensile > 0) {
    amount = savedRetaMensile;
  } else {
    let monthlyNet = 0;
    if (redditoN1 != null && redditoN1 > 0) {
      monthlyNet = redditoN1 / 12;
    } else if (currentIncome != null && currentIncome > 0) {
      const rendimientoNeto = currentIncome - calculateGastosDificilJustificacion(currentIncome);
      monthlyNet = rendimientoNeto / 12;
    }
    amount = calculateRETA(monthlyNet);
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

/** Returns 12 virtual RETA deadlines (last day of each month) for display only — never saved to DB. */
export function getAllRetaDeadlines(year: number, options?: SpanishDeadlinesOptions): Array<{ id: string; title: string; date: string; amount: number; type: 'tax' }> {
  const redditoN1 = options?.redditoN1;
  const currentIncome = options?.currentIncome;
  const savedRetaMensile = options?.savedRetaMensile;

  // Priorità: savedRetaMensile (valore salvato dall'utente) → redditoN1 → currentIncome → minimo
  let amount: number;
  if (savedRetaMensile != null && savedRetaMensile > 0) {
    amount = savedRetaMensile;
  } else {
    let monthlyNet = 0;
    if (redditoN1 != null && redditoN1 > 0) {
      monthlyNet = redditoN1 / 12;
    } else if (currentIncome != null && currentIncome > 0) {
      const rendimientoNeto = currentIncome - calculateGastosDificilJustificacion(currentIncome);
      monthlyNet = rendimientoNeto / 12;
    }
    amount = calculateRETA(monthlyNet);
  }
  return Array.from({ length: 12 }, (_, i) => ({
    id: `reta-virtual-${year}-${i}`,
    title: 'Cuota RETA \u2014 Seguridad Social',
    date: lastDayOfMonth(year, i),
    amount,
    type: 'tax' as const,
  }));
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
