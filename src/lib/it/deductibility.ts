export const IT_DEDUCTIBILITY_RATES: Record<string, number> = {
  abbonamento: 1,
  materiale: 1,
  software: 1,
  formazione: 1,
  telefono: 0.80,
  auto_moto: 0.20,
  casa_ufficio: 0.50,
  pasti: 0.75,
  altro: 1,
};

/** Returns the deductibility rate (0–1) for an IT expense category. Defaults to 1 for unknown categories. */
export function getItDeductibilityRate(category: string | undefined): number {
  if (!category) return 1;
  return IT_DEDUCTIBILITY_RATES[category.toLowerCase()] ?? 1;
}
