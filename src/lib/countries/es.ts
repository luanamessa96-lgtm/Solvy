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

// IRPF 2026 — aliquote statali invariate dal 2022 (L.199/2025 non le ha modificate)
const IRPF_BRACKETS = [
  { limit: 12450, rate: 0.19 },
  { limit: 20200, rate: 0.24 },
  { limit: 35200, rate: 0.30 },
  { limit: 60000, rate: 0.37 },
  { limit: 300000, rate: 0.45 },
  { limit: Infinity, rate: 0.47 },
];

// RETA 2026 — cuota mínima mensile per tramo (Orden PJC/297/2026, BOE-A-2026-7296)
// Sistema cotización por rendimientos netos (RD-ley 13/2022), vigente dal 2023.
// Tipo total 2026: 31,50% (era 31,40% nel 2025, +0,10 pp. MEI).
// Cuota = base_mínima_tramo × 31,50% — Solvy usa la base minima con disclaimer "stimato".
// ✅ Confermato da SKILL.md (tramos 1–4, 7, 11, 14); ⚠️ interpolato da basi 2025 × 31,50% (resto).
export const RETA_BRACKETS = [
  { maxIncome: 670,      monthlyQuote: 206 }, // ✅ base min €653,59 × 31,50% = €205,88
  { maxIncome: 900,      monthlyQuote: 227 }, // ✅ base min €718,95 × 31,50% = €226,47 (congelata)
  { maxIncome: 1166.70,  monthlyQuote: 268 }, // ✅ base min €849,67 × 31,50% = €267,65 (congelata)
  { maxIncome: 1300,     monthlyQuote: 300 }, // ✅ base min €950,98 × 31,50% = €299,56
  { maxIncome: 1500,     monthlyQuote: 303 }, // ⚠️ base min ~€960,78 × 31,50% = €302,65
  { maxIncome: 1700,     monthlyQuote: 330 }, // ⚠️ base min ~€1.045,75 × 31,50% = €329,41
  { maxIncome: 1850,     monthlyQuote: 360 }, // ✅ base min €1.143,79 × 31,50% = €360,29
  { maxIncome: 2030,     monthlyQuote: 381 }, // ⚠️ base min ~€1.209,15 × 31,50% = €380,88
  { maxIncome: 2330,     monthlyQuote: 402 }, // ⚠️ base min ~€1.274,86 × 31,50% = €401,58
  { maxIncome: 2760,     monthlyQuote: 440 }, // ⚠️ base min ~€1.395,45 × 31,50% = €439,57
  { maxIncome: 3190,     monthlyQuote: 453 }, // ✅ base min €1.437,91 × 31,50% = €452,94
  { maxIncome: 4139,     monthlyQuote: 453 }, // ⚠️ base min €1.437,91 (stesso tramo 11)
  { maxIncome: 6000,     monthlyQuote: 478 }, // ⚠️ base min ~€1.516,93 × 31,50% = €477,83
  { maxIncome: Infinity, monthlyQuote: 607 }, // ✅ base min €1.928,10 × 31,50% = €607,35 (>€6.000)
];

// Tarifa plana — ABOLITA dal 1° gennaio 2023 (RD-ley 13/2022).
// Dal 2023 si applica la cotización por rendimientos netos per tutti gli autónomos.
// La funzione è mantenuta per compatibilità ma restituisce sempre 'normal' per startYear >= 2023.
const TARIFA_PLANA_INCOME_THRESHOLD = 14208; // SMI 2026: €1.184/mese × 12 (RD 126/2026) — riferimento storico
const TARIFA_PLANA_QUOTE = 80; // valore storico, non più applicabile

export type TarifaPlanaStatus = 'year1' | 'year2_below_threshold' | 'normal';

/**
 * @deprecated La tarifa plana €80/mese è ABOLITA dal 1° gennaio 2023 (RD-ley 13/2022).
 * Tutti gli autónomos con startYear >= 2023 ricadono nel sistema ordinario (cotización por ingresos reales).
 * Questa funzione restituisce sempre 'normal' per startYear >= 2023.
 */
export function getTarifaPlanaStatus(
  startYear: number | undefined,
  currentYear: number,
  annualGrossIncome: number
): TarifaPlanaStatus {
  // Tarifa plana abolita dal 2023: nessun autónomo che inizia da 2023 può accedervi
  if (!startYear || startYear >= 2023) return 'normal';
  const yearsActive = currentYear - startYear;
  if (yearsActive < 1) return 'year1';
  if (yearsActive < 2 && annualGrossIncome < TARIFA_PLANA_INCOME_THRESHOLD) return 'year2_below_threshold';
  return 'normal';
}

export function calculateRETA_withTarifaPlana(
  monthlyNetIncome: number,
  startYear: number | undefined,
  currentYear: number,
  annualGrossIncome: number
): { monthly: number; status: TarifaPlanaStatus } {
  const status = getTarifaPlanaStatus(startYear, currentYear, annualGrossIncome);
  if (status === 'year1' || status === 'year2_below_threshold') {
    return { monthly: TARIFA_PLANA_QUOTE, status };
  }
  return { monthly: calculateRETA(monthlyNetIncome), status: 'normal' };
}

/**
 * Gastos de difícil justificación — EDS (art.30 RIRPF)
 * 5% del rendimiento neto previo (ingresos − gastos analíticos), máximo €2.000.
 * Tasso tornato al 5% nel 2024 (era 7% nel 2023). Manual IRPF 2024, p.16.
 */
export function calculateGastosDificilJustificacion(rendimientoNetoPrevio: number): number {
  if (rendimientoNetoPrevio <= 0) return 0;
  return Math.min(rendimientoNetoPrevio * 0.05, 2000);
}

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
  applyRetenciones: boolean = false,
  startYear?: number,
  currentYear: number = new Date().getFullYear(),
  deductibleExpenses: number = 0
): SpanishTaxResult & { tarifaPlanaStatus: TarifaPlanaStatus; monthlyRETA: number; rendimientoNeto: number } {
  // D2: rendimiento neto previo = ingresos − gastos analíticos
  const rendimientoNetoPrevio = Math.max(0, grossIncome - deductibleExpenses);
  // Gastos difícil justificación: 5% del rendimiento neto previo, máx €2.000 (art.30 RIRPF, Manual IRPF 2024)
  const gastosDificil = calculateGastosDificilJustificacion(rendimientoNetoPrevio);
  const rendimientoNeto = rendimientoNetoPrevio - gastosDificil;
  const irpf = calculateIRPF(rendimientoNeto);
  const monthlyNet = rendimientoNeto / 12;
  const { monthly: monthlyRETA, status: tarifaPlanaStatus } = calculateRETA_withTarifaPlana(
    monthlyNet, startYear, currentYear, grossIncome
  );
  const reta = monthlyRETA * 12;
  const retenciones = applyRetenciones ? calculateRetenciones(grossIncome, isFirstThreeYears) : 0;
  const netIncome = rendimientoNeto - irpf - reta;
  const effectiveRate = grossIncome > 0 ? (irpf + reta) / grossIncome : 0;

  return {
    grossIncome,
    irpf,
    reta,
    retenciones,
    netIncome,
    effectiveRate,
    tarifaPlanaStatus,
    monthlyRETA,
    rendimientoNeto,
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
    { title: 'Modelo 303+130 — T4', date: `${year + 1}-01-30`, type: 'trimestrale' },
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
    const { grossIncome = 0, isFirstThreeYears = false, applyRetenciones = false, startYear } = input;
    const currentYear = new Date().getFullYear();
    // D2: gastos analíticos → rendimiento neto previo → gastos difícil 5% (art.30 RIRPF)
    const deductibleExpenses = Math.max(0, input.deductibleExpenses ?? 0);
    const rendimientoNetoPrevio = Math.max(0, grossIncome - deductibleExpenses);
    const gastosDificil = calculateGastosDificilJustificacion(rendimientoNetoPrevio);
    const rendimientoNeto = rendimientoNetoPrevio - gastosDificil;
    const irpf = calculateIRPF(rendimientoNeto);
    const monthlyNet = rendimientoNeto / 12;
    const { monthly: monthlyRETA, status: tarifaPlanaStatus } = calculateRETA_withTarifaPlana(
      monthlyNet, startYear, currentYear, grossIncome
    );
    const reta = monthlyRETA * 12;
    const retenciones = applyRetenciones ? calculateRetenciones(grossIncome, isFirstThreeYears) : 0;
    const netIncome = rendimientoNeto - irpf - reta;
    return {
      grossIncome,
      taxableIncome: rendimientoNeto,
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
        tarifaPlanaStatus,
        retencionRate: isFirstThreeYears ? 0.07 : 0.15,
        rendimientoNetoPrevio,
        gastosDificilJustificacion: gastosDificil,
        rendimientoNeto,
        deductibleExpenses,
      },
    };
  },
  calculateContributions: (input: TaxInput): ContributionsResult => {
    const currentYear = new Date().getFullYear();
    const monthlyNet = (input.grossIncome ?? 0) / 12;
    const { monthly, status } = calculateRETA_withTarifaPlana(
      monthlyNet, input.startYear, currentYear, input.grossIncome ?? 0
    );
    const isTarifaPlana = status !== 'normal';
    return {
      monthly,
      annual: monthly * 12,
      label: isTarifaPlana
        ? `RETA — Tarifa Plana €${monthly}/mes (${status === 'year1' ? '1er año' : '2º año'})`
        : 'RETA (Seguridad Social autónomos)',
    };
  },
};

export default spainModule;
