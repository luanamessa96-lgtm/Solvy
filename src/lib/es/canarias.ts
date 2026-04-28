// Fiscalità Isole Canarie — IGIC (Impuesto General Indirecto Canario)
// Ley 20/1991 — regime speciale, sostituisce IVA integralmente.
// Aliquote vigenti: 0%, 3% (ridotta), 7% (standard).

export const IGIC_DEFAULT_RATE = 7;

export function getIgicRates(): number[] {
  return [0, 3, 7];
}

export function getIgicLabel(rate: number): string {
  return `IGIC ${rate}%`;
}

export function isCanarias(territory: string | undefined): boolean {
  return territory === 'canarias';
}
