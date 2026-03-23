// Spanish fiscal calculations — Estimación directa simplificada
import type { CountryModule, TaxInput, TaxResult, ContributionsResult, FiscalDeadline } from './types';

// ── Legacy interface kept for backward-compat with existing consumers ──────
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

// RETA monthly quotes by income bracket (monthly net income → monthly quote)
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

// ── Validation helpers ─────────────────────────────────────────────────────
const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

function validateNIF(nif: string): boolean {
  const c = nif.toUpperCase().trim();
  if (!/^\d{8}[A-Z]$/.test(c)) return false;
  return c[8] === NIF_LETTERS[parseInt(c.slice(0, 8)) % 23];
}

function validateNIE(nie: string): boolean {
  const c = nie.toUpperCase().trim();
  if (!/^[XYZ]\d{7}[A-Z]$/.test(c)) return false;
  const rep = c[0] === 'X' ? '0' : c[0] === 'Y' ? '1' : '2';
  return validateNIF(rep + c.slice(1));
}

function validateIBAN_ES(iban: string): boolean {
  const c = iban.replace(/\s/g, '').toUpperCase();
  return c.startsWith('ES') && c.length === 24;
}

function getSpanishDeadlines(year: number): FiscalDeadline[] {
  return [
    { title: 'Modelo 303+130 — T1', date: `${year}-04-20`, type: 'trimestrale' },
    { title: 'Modelo 303+130 — T2', date: `${year}-07-20`, type: 'trimestrale' },
    { title: 'Modelo 303+130 — T3', date: `${year}-10-20`, type: 'trimestrale' },
    { title: 'Modelo 303+130 — T4', date: `${year + 1}-01-20`, type: 'trimestrale' },
    { title: 'Modelo 390 — Resumen anual IVA', date: `${year + 1}-01-30`, type: 'annuale' },
    { title: 'Modelo 100 — Renta anual', date: `${year}-06-30`, type: 'annuale' },
  ];
}

// ── CountryModule implementation ───────────────────────────────────────────
export const spainModule: CountryModule = {
  code: 'ES',
  name: 'España',
  currency: 'EUR',
  language: 'es',
  vatRates: [0, 4, 10, 21],
  defaultVatRate: 21,
  taxRegimes: [
    { value: 'autonomo', label: 'Estimación directa simplificada' },
  ],
  getDeadlines: getSpanishDeadlines,
  validation: {
    taxId: {
      label: 'NIF',
      placeholder: '12345678A',
      validate: validateNIF,
      errorMessage: 'NIF non valido (8 cifre + lettera)',
    },
    secondaryTaxId: {
      label: 'NIE',
      placeholder: 'X1234567A',
      validate: validateNIE,
      errorMessage: 'NIE non valido (X/Y/Z + 7 cifre + lettera)',
      optional: true,
    },
    iban: {
      validate: validateIBAN_ES,
      errorMessage: 'IBAN spagnolo non valido (deve iniziare con ES, 24 caratteri)',
    },
  },
  invoiceTerms: {
    labels: {
      invoice: 'Factura',
      provider: 'Emisor',
      client: 'Receptor',
      taxableAmount: 'Base imponible',
      vat: 'Cuota IVA',
      withholding: 'Retención IRPF',
      total: 'Total',
      invoiceNumber: (num, year) => `F-${year}-${String(num).padStart(3, '0')}`,
    },
    legalNote: 'Régimen especial de trabajadores autónomos. Sujeto a retención del IRPF según normativa vigente.',
    showBollo: false,
  },
  calculateTax: (input: TaxInput): TaxResult => {
    const { grossIncome = 0, isFirstThreeYears = false, applyRetenciones = false } = input;
    const irpf = calculateIRPF(grossIncome);
    const monthlyNet = grossIncome / 12;
    const monthlyRETA = calculateRETA(monthlyNet);
    const reta = monthlyRETA * 12;
    const retenciones = applyRetenciones ? calculateRetenciones(grossIncome, isFirstThreeYears) : 0;
    const netIncome = grossIncome - irpf - reta;
    return {
      grossIncome,
      taxableIncome: grossIncome,
      incomeTax: irpf,
      socialContributions: reta,
      vatRate: 21,
      netIncome,
      effectiveRate: grossIncome > 0 ? (irpf + reta) / grossIncome : 0,
      details: {
        irpf,
        reta,
        retenciones,
        monthlyRETA,
        retencionRate: isFirstThreeYears ? 0.07 : 0.15,
      },
    };
  },
  calculateContributions: (input: TaxInput): ContributionsResult => {
    const monthlyNet = (input.grossIncome ?? 0) / 12;
    const monthly = calculateRETA(monthlyNet);
    return {
      monthly,
      annual: monthly * 12,
      label: 'RETA (Seguridad Social autónomos)',
    };
  },
};

export default spainModule;
