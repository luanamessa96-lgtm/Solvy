export const ES_DEDUCTIBILITY_RATES: Record<string, number> = {
  suscripcion: 1,
  material:    1,
  software:    1,
  formacion:   1,
  telefono:    0.5,
  // Legacy values stored before Spanish translation (backward compat — all 100%)
  abbonamento: 1,
  materiale:   1,
  formazione:  1,
  otro:        1,
  otro_: 1,
};

/** Returns the deductibility rate (0–1) for a Spain expense category. Defaults to 1 for unknown categories. */
export function getEsDeductibilityRate(category: string | undefined): number {
  if (!category) return 1;
  return ES_DEDUCTIBILITY_RATES[category.toLowerCase()] ?? 1;
}
