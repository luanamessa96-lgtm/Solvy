// Spanish fiscal calculations — Estimación directa simplificada

export interface SpanishTaxResult {
  grossIncome: number;
  irpf: number;
  reta: number;
  retenciones: number;
  netIncome: number;
  effectiveRate: number;
}

// IRPF 2024 brackets
const IRPF_BRACKETS = [
  { limit: 12450, rate: 0.19 },
  { limit: 20200, rate: 0.24 },
  { limit: 35200, rate: 0.30 },
  { limit: 60000, rate: 0.37 },
  { limit: 300000, rate: 0.45 },
  { limit: Infinity, rate: 0.47 },
];

// RETA monthly quotes by income bracket (annual income → monthly quote)
const RETA_BRACKETS = [
  { maxIncome: 670, monthlyQuote: 230 },
  { maxIncome: 900, monthlyQuote: 260 },
  { maxIncome: 1166, monthlyQuote: 275 },
  { maxIncome: 1300, monthlyQuote: 294 },
  { maxIncome: 1500, monthlyQuote: 320 },
  { maxIncome: 1700, monthlyQuote: 350 },
  { maxIncome: 1850, monthlyQuote: 370 },
  { maxIncome: 2030, monthlyQuote: 390 },
  { maxIncome: Infinity, monthlyQuote: 500 },
];

export function calculateIRPF(grossIncome: number): number {
  if (grossIncome <= 0) return 0;
  let tax = 0;
  let previousLimit = 0;
  for (const bracket of IRPF_BRACKETS) {
    if (grossIncome <= previousLimit) break;
    const taxableInBracket = Math.min(grossIncome, bracket.limit) - previousLimit;
    tax += taxableInBracket * bracket.rate;
    previousLimit = bracket.limit;
    if (bracket.limit === Infinity) break;
  }
  return Math.round(tax * 100) / 100;
}

export function calculateRETA(monthlyNetIncome: number): number {
  // monthlyNetIncome is the average monthly net income
  const bracket = RETA_BRACKETS.find(b => monthlyNetIncome <= b.maxIncome);
  return bracket ? bracket.monthlyQuote : 500;
}

export function calculateRetenciones(amount: number, isFirstThreeYears: boolean = false): number {
  const rate = isFirstThreeYears ? 0.07 : 0.15;
  return Math.round(amount * rate * 100) / 100;
}

export function calculateSpanishTaxes(
  grossIncome: number,
  isFirstThreeYears: boolean = false,
  applyRetenciones: boolean = false
): SpanishTaxResult {
  const irpf = calculateIRPF(grossIncome);
  const monthlyNet = grossIncome / 12;
  const monthlyRETA = calculateRETA(monthlyNet);
  const reta = monthlyRETA * 12;
  const retenciones = applyRetenciones ? calculateRetenciones(grossIncome, isFirstThreeYears) : 0;
  const netIncome = grossIncome - irpf - reta;
  const effectiveRate = grossIncome > 0 ? (irpf + reta) / grossIncome : 0;

  return {
    grossIncome,
    irpf,
    reta,
    retenciones,
    netIncome,
    effectiveRate,
  };
}
