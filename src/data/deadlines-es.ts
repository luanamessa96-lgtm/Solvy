export interface FiscalDeadline {
  title: string;
  date: string; // YYYY-MM-DD format
  amount?: number;
  type: string;
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
