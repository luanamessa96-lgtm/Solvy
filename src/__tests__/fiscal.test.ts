import { describe, it, expect } from 'vitest';

// ── Italy ─────────────────────────────────────────────────────────────────────
import { italyModule } from '../lib/countries/it';

// ── Spain ─────────────────────────────────────────────────────────────────────
import {
  calculateIRPF,
  calculateRETA,
  calculateRetenciones,
  getTarifaPlanaStatus,
  calculateRETA_withTarifaPlana,
  calculateGastosDificilJustificacion,
  calculateSpanishTaxes,
  getReduccionInicio,
  getMesesDeAlta,
  RETA_BRACKETS,
} from '../lib/countries/es';
import { getEsDeductibilityRate } from '../lib/es/deductibility';
import { calcularTrimestre } from '../services/modelosES';
import type { Document } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInvoice(amount: number, date: string, ivaRate = 21, status: 'paid' | 'pending' = 'paid'): Document {
  return { id: Math.random().toString(), type: 'invoice', title: 'Test', client: 'Client', amount, date, status, ivaRate } as Document;
}

function makeExpense(amount: number, date: string, category = 'material', ivaRate = 21): Document {
  return { id: Math.random().toString(), type: 'expense', title: 'Gasto', amount, date, category, ivaRate } as Document;
}

function makeRectificativa(amount: number, date: string, ivaRate = 21): Document {
  return { id: Math.random().toString(), type: 'factura_rectificativa', title: 'Rect', amount, date, ivaRate } as Document;
}

function makeIntracomunitaria(amount: number, date: string): Document {
  return { id: Math.random().toString(), type: 'invoice', title: 'Intracom', client: 'EU Client', amount, date, status: 'paid', ivaRate: 0, intracomunitaria: true } as Document;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITALY — IRPEF Forfettario
// ═══════════════════════════════════════════════════════════════════════════════

describe('Italy — IRPEF Forfettario', () => {
  it('applica aliquota 5% nei primi 5 anni di attività', () => {
    const currentYear = new Date().getFullYear();
    const result = italyModule.calculateTax({
      grossIncome: 30000,
      regime: 'forfettario',
      categoryCoeff: 0.78,
      startYear: currentYear - 2, // 2 anni fa → < 5 → 5%
    });
    const expectedTaxable = 30000 * 0.78; // 23400 — lordo × coeff
    const expectedINPS = expectedTaxable * 0.2607;
    const expectedBase = expectedTaxable - expectedINPS; // INPS deducibile (Circ. AdE 10/E 2016)
    expect(result.taxableIncome).toBeCloseTo(expectedTaxable);
    expect(result.incomeTax).toBeCloseTo(expectedBase * 0.05);
    expect(result.details?.aliquota).toBe(0.05);
  });

  it('applica aliquota 15% dopo i primi 5 anni', () => {
    const currentYear = new Date().getFullYear();
    const result = italyModule.calculateTax({
      grossIncome: 30000,
      regime: 'forfettario',
      categoryCoeff: 0.78,
      startYear: currentYear - 10,
    });
    const expectedTaxable = 30000 * 0.78;
    const expectedINPS = expectedTaxable * 0.2607;
    const expectedBase = expectedTaxable - expectedINPS; // INPS deducibile (Circ. AdE 10/E 2016)
    expect(result.incomeTax).toBeCloseTo(expectedBase * 0.15);
    expect(result.details?.aliquota).toBe(0.15);
  });

  it('usa il coefficiente ATECO corretto (0.67 per commercio)', () => {
    const result = italyModule.calculateTax({
      grossIncome: 50000,
      regime: 'forfettario',
      categoryCoeff: 0.67,
      startYear: new Date().getFullYear() - 10,
    });
    expect(result.taxableIncome).toBeCloseTo(50000 * 0.67);
  });

  it('calcola INPS gestione separata al 26.07% sul reddito imponibile', () => {
    const result = italyModule.calculateTax({
      grossIncome: 40000,
      regime: 'forfettario',
      categoryCoeff: 0.78,
      startYear: new Date().getFullYear() - 10,
    });
    const expectedTaxable = 40000 * 0.78;
    expect(result.socialContributions).toBeCloseTo(expectedTaxable * 0.2607, 0);
  });

  it('reddito netto = lordo − IRPEF − INPS', () => {
    const result = italyModule.calculateTax({
      grossIncome: 25000,
      regime: 'forfettario',
      categoryCoeff: 0.78,
      startYear: new Date().getFullYear() - 10,
    });
    expect(result.netIncome).toBeCloseTo(result.grossIncome - result.incomeTax - result.socialContributions);
  });

  it('reddito zero → tutto zero', () => {
    const result = italyModule.calculateTax({ grossIncome: 0, regime: 'forfettario', categoryCoeff: 0.78 });
    expect(result.incomeTax).toBe(0);
    expect(result.socialContributions).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ITALY — IRPEF Ordinario (scaglioni)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Italy — IRPEF Ordinario (scaglioni)', () => {
  it('scaglione ≤ 28.000 → 23%', () => {
    const result = italyModule.calculateTax({ grossIncome: 20000, regime: 'ordinario' });
    // INPS GS 26.07% deducibile ex art. 10 TUIR: base IRPEF = 20000 - (20000 * 0.2607)
    const inps = 20000 * 0.2607;
    const base = 20000 - inps;
    const expectedIRPEF = base * 0.23;
    const expectedAddl = base * 0.023;
    expect(result.incomeTax).toBeCloseTo(expectedIRPEF + expectedAddl, 0);
  });

  it('scaglione 28.001–50.000 → 23% + 33% (IRPEF su base netta INPS, L.199/2025)', () => {
    const result = italyModule.calculateTax({ grossIncome: 40000, regime: 'ordinario' });
    // INPS deducibile ex art. 10 TUIR: base IRPEF = 40000 - (40000 * 0.2607)
    const inps = 40000 * 0.2607;
    const base = 40000 - inps;
    const irpef = 28000 * 0.23 + (base - 28000) * 0.33;
    const addl = base * 0.023;
    expect(result.incomeTax).toBeCloseTo(irpef + addl, 0);
  });

  it('scaglione oltre 50.000 → 23% + 33% + 43% (IRPEF su base netta INPS, L.199/2025)', () => {
    const result = italyModule.calculateTax({ grossIncome: 70000, regime: 'ordinario' });
    // INPS deducibile ex art. 10 TUIR: base IRPEF = 70000 - (70000 * 0.2607)
    const inps = 70000 * 0.2607;
    const base = 70000 - inps;
    const irpef = 28000 * 0.23 + 22000 * 0.33 + (base - 50000) * 0.43;
    const addl = base * 0.023;
    expect(result.incomeTax).toBeCloseTo(irpef + addl, 0);
  });

  it('INPS ordinario gestione separata al 26.07%', () => {
    const result = italyModule.calculateTax({ grossIncome: 30000, regime: 'ordinario' });
    expect(result.socialContributions).toBeCloseTo(30000 * 0.2607);
  });

  it('effectiveRate coerente con i calcoli', () => {
    const result = italyModule.calculateTax({ grossIncome: 50000, regime: 'ordinario' });
    const expected = (result.incomeTax + result.socialContributions) / result.grossIncome;
    expect(result.effectiveRate).toBeCloseTo(expected, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ITALY — Ordinario con spese deducibili (D1)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Italy — Ordinario con deductibleExpenses', () => {
  it('D1: spese analitiche riducono base INPS e IRPEF (art. 54 TUIR)', () => {
    // Scenario: fatturato €45.000, spese €5.000 → base netta €40.000
    const result = italyModule.calculateTax({ grossIncome: 45000, regime: 'ordinario', deductibleExpenses: 5000 });
    const netBase = 45000 - 5000; // 40000
    const expectedINPS = netBase * 0.2607;
    const irpefBase = netBase - expectedINPS;
    const expectedIRPEF = 28000 * 0.23 + (irpefBase - 28000) * 0.33;
    const expectedAddl = irpefBase * 0.023;
    expect(result.socialContributions).toBeCloseTo(expectedINPS, 0);
    expect(result.incomeTax).toBeCloseTo(expectedIRPEF + expectedAddl, 0);
    expect(result.netIncome).toBeCloseTo(netBase - expectedINPS - (expectedIRPEF + expectedAddl), 0);
  });

  it('D1: senza spese (default 0) → comportamento invariato', () => {
    const withExpenses = italyModule.calculateTax({ grossIncome: 40000, regime: 'ordinario', deductibleExpenses: 0 });
    const withoutField  = italyModule.calculateTax({ grossIncome: 40000, regime: 'ordinario' });
    expect(withExpenses.incomeTax).toBeCloseTo(withoutField.incomeTax, 2);
    expect(withExpenses.socialContributions).toBeCloseTo(withoutField.socialContributions, 2);
  });

  it('D1: grossIncome === deductibleExpenses → tutto zero', () => {
    const result = italyModule.calculateTax({ grossIncome: 10000, regime: 'ordinario', deductibleExpenses: 10000 });
    expect(result.socialContributions).toBe(0);
    expect(result.incomeTax).toBe(0);
  });

  it('D1: calculateContributions ordinario sottrae spese dalla base', () => {
    const res = italyModule.calculateContributions({ grossIncome: 50000, regime: 'ordinario', deductibleExpenses: 10000 });
    expect(res.annual).toBeCloseTo(40000 * 0.2607, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ITALY — INPS Gestione Separata (calculateContributions)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Italy — INPS Gestione Separata', () => {
  it('forfettario: contributi su reddito imponibile (coeff × lordo) al 26.07%', () => {
    const res = italyModule.calculateContributions({ grossIncome: 40000, regime: 'forfettario', categoryCoeff: 0.78 });
    const taxable = 40000 * 0.78;
    expect(res.annual).toBeCloseTo(taxable * 0.2607, 0);
    expect(res.monthly).toBeCloseTo(res.annual / 12, 2);
  });

  it('ordinario: contributi gestione separata al 26.07%', () => {
    const res = italyModule.calculateContributions({ grossIncome: 50000, regime: 'ordinario', categoryCoeff: 0.78 });
    expect(res.annual).toBeCloseTo(50000 * 0.2607, 0);
  });

  it('label = "INPS Gestione Separata"', () => {
    const res = italyModule.calculateContributions({ grossIncome: 30000, regime: 'forfettario', categoryCoeff: 0.78 });
    expect(res.label).toBe('INPS Gestione Separata');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — IRPF (scaglioni 2024)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — calculateIRPF', () => {
  it('0 → 0', () => {
    expect(calculateIRPF(0)).toBe(0);
  });

  it('importo negativo → 0', () => {
    expect(calculateIRPF(-500)).toBe(0);
  });

  it('scaglione ≤ 12.450 → 19%', () => {
    expect(calculateIRPF(10000)).toBeCloseTo(10000 * 0.19, 1);
  });

  it('scaglione 12.450–20.200 → 19% + 24%', () => {
    const expected = 12450 * 0.19 + (18000 - 12450) * 0.24;
    expect(calculateIRPF(18000)).toBeCloseTo(expected, 1);
  });

  it('scaglione 20.200–35.200 → ... + 30%', () => {
    const expected = 12450 * 0.19 + (20200 - 12450) * 0.24 + (30000 - 20200) * 0.30;
    expect(calculateIRPF(30000)).toBeCloseTo(expected, 1);
  });

  it('scaglione 35.200–60.000 → ... + 37%', () => {
    const expected =
      12450 * 0.19 +
      (20200 - 12450) * 0.24 +
      (35200 - 20200) * 0.30 +
      (50000 - 35200) * 0.37;
    expect(calculateIRPF(50000)).toBeCloseTo(expected, 1);
  });

  it('scaglione 60.000–300.000 → ... + 45%', () => {
    const expected =
      12450 * 0.19 +
      (20200 - 12450) * 0.24 +
      (35200 - 20200) * 0.30 +
      (60000 - 35200) * 0.37 +
      (100000 - 60000) * 0.45;
    expect(calculateIRPF(100000)).toBeCloseTo(expected, 0);
  });

  it('scaglione > 300.000 → ... + 47%', () => {
    const expected =
      12450 * 0.19 +
      (20200 - 12450) * 0.24 +
      (35200 - 20200) * 0.30 +
      (60000 - 35200) * 0.37 +
      (300000 - 60000) * 0.45 +
      (400000 - 300000) * 0.47;
    expect(calculateIRPF(400000)).toBeCloseTo(expected, 0);
  });

  it('risultato arrotondato a 2 decimali', () => {
    const res = calculateIRPF(25000);
    expect(res).toBe(Math.round(res * 100) / 100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Gastos difícil justificación (D2)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — calculateGastosDificilJustificacion (art.30 RIRPF)', () => {
  it('5% su rendimiento neto previo', () => {
    expect(calculateGastosDificilJustificacion(10000)).toBeCloseTo(500, 2);
  });

  it('cap a €2.000 quando 5% supera il massimale', () => {
    expect(calculateGastosDificilJustificacion(50000)).toBe(2000);
    expect(calculateGastosDificilJustificacion(100000)).toBe(2000);
  });

  it('soglia esatta: 5% di €40.000 = €2.000 (al limite)', () => {
    expect(calculateGastosDificilJustificacion(40000)).toBeCloseTo(2000, 2);
  });

  it('rendimento neto ≤ 0 → 0', () => {
    expect(calculateGastosDificilJustificacion(0)).toBe(0);
    expect(calculateGastosDificilJustificacion(-100)).toBe(0);
  });

  it('Scenario D2: ingresos €35.000 − gastos €4.000 → rend. previo €31.000 → gdf €1.550', () => {
    // Rendimiento neto previo = 35000 - 4000 = 31000; 5% = 1550 < 2000
    expect(calculateGastosDificilJustificacion(31000)).toBeCloseTo(1550, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — RETA (fasce 2023)
// ═══════════════════════════════════════════════════════════════════════════════

// RETA 2026 — Orden PJC/297/2026, tipo total 31,50%, cuota = base_mínima × 31,50%
// ✅ = confermato SKILL.md; ⚠️ = interpolato da basi 2025 × 31,50%
describe('Spain — calculateRETA (2026)', () => {
  it('≤ €670/mese → €206/mese ✅ (base min €653,59)', () => {
    expect(calculateRETA(500)).toBe(206);
    expect(calculateRETA(670)).toBe(206);
  });

  it('€670–€900/mese → €227/mese ✅ (base min €718,95, congelata)', () => {
    expect(calculateRETA(800)).toBe(227);
  });

  it('€900–€1.166,70/mese → €268/mese ✅ (base min €849,67, congelata)', () => {
    expect(calculateRETA(1000)).toBe(268);
  });

  it('€1.166,70–€1.300/mese → €300/mese ✅ (base min €950,98)', () => {
    expect(calculateRETA(1250)).toBe(300);
  });

  it('€1.300–€1.500/mese → €303/mese ⚠️ (base ~€960,78)', () => {
    expect(calculateRETA(1400)).toBe(303);
  });

  it('€1.500–€1.700/mese → €330/mese ⚠️ (base ~€1.045,75)', () => {
    expect(calculateRETA(1600)).toBe(330);
  });

  it('€1.700–€1.850/mese → €360/mese ✅ (base min €1.143,79)', () => {
    expect(calculateRETA(1800)).toBe(360);
  });

  it('€1.850–€2.030/mese → €381/mese ⚠️ (base ~€1.209,15)', () => {
    expect(calculateRETA(2000)).toBe(381);
  });

  it('€2.030–€2.330/mese → €402/mese ⚠️', () => {
    expect(calculateRETA(2200)).toBe(402);
  });

  it('€2.330–€2.760/mese → €440/mese ⚠️', () => {
    expect(calculateRETA(2500)).toBe(440);
  });

  it('€2.760–€3.190/mese → €453/mese ✅ (base min €1.437,91)', () => {
    expect(calculateRETA(3000)).toBe(453);
  });

  it('€3.190–€4.139/mese → €453/mese ⚠️ (stessa base tramo 11)', () => {
    expect(calculateRETA(3500)).toBe(453);
  });

  it('€4.139–€6.000/mese → €478/mese ⚠️ (base ~€1.516,93)', () => {
    expect(calculateRETA(5000)).toBe(478);
  });

  it('> €6.000/mese → €607/mese ✅ (base min €1.928,10)', () => {
    expect(calculateRETA(7000)).toBe(607);
    expect(calculateRETA(10000)).toBe(607);
  });

  it('reddito zero → fascia minima €206 (tramo 1)', () => {
    expect(calculateRETA(0)).toBe(206);
  });

  it('tutte le fasce coperte (nessun buco)', () => {
    for (const bracket of RETA_BRACKETS) {
      if (bracket.maxIncome !== Infinity) {
        expect(calculateRETA(bracket.maxIncome)).toBe(bracket.monthlyQuote);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Tarifa Plana
// ═══════════════════════════════════════════════════════════════════════════════

// Tarifa plana ABOLITA dal 1° gennaio 2023 (RD-ley 13/2022).
// Dal 2023 tutti gli autónomos usano la cotización por ingresos reales.
// I test verificano che startYear >= 2023 restituisca sempre 'normal'.
describe('Spain — Tarifa Plana (abolita dal 2023)', () => {
  const currentYear = 2026;

  it('startYear undefined → normal', () => {
    expect(getTarifaPlanaStatus(undefined, currentYear, 20000)).toBe('normal');
  });

  it('startYear 2026 (>= 2023) → normal (tarifa plana abolita)', () => {
    expect(getTarifaPlanaStatus(2026, currentYear, 100000)).toBe('normal');
  });

  it('startYear 2025 (>= 2023) → normal anche se reddito sotto soglia', () => {
    expect(getTarifaPlanaStatus(2025, currentYear, 8000)).toBe('normal');
  });

  it('startYear 2025 (>= 2023) + reddito sopra soglia → normal', () => {
    expect(getTarifaPlanaStatus(2025, currentYear, 15000)).toBe('normal');
  });

  it('startYear 2024 (>= 2023) → normal', () => {
    expect(getTarifaPlanaStatus(2024, currentYear, 5000)).toBe('normal');
  });

  it('startYear 2022 (< 2023), terzo anno attivo → normal (anni attivi >= 3)', () => {
    // Anche per chi aveva tarifa plana pre-2023, dopo 3 anni ricade nel normale
    expect(getTarifaPlanaStatus(2022, currentYear, 5000)).toBe('normal');
  });

  it('calculateRETA_withTarifaPlana: startYear 2026 → quota fascia standard (no tarifa plana)', () => {
    const { monthly, status } = calculateRETA_withTarifaPlana(1000, 2026, currentYear, 20000);
    expect(monthly).toBe(calculateRETA(1000));
    expect(status).toBe('normal');
  });

  it('calculateRETA_withTarifaPlana: startYear 2020, anni > 2 → quota fascia standard', () => {
    const { monthly, status } = calculateRETA_withTarifaPlana(1000, 2020, currentYear, 20000);
    expect(monthly).toBe(calculateRETA(1000));
    expect(status).toBe('normal');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Retenciones IRPF
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — calculateRetenciones', () => {
  it('primi 3 anni → 7%', () => {
    expect(calculateRetenciones(10000, true)).toBeCloseTo(10000 * 0.07, 2);
  });

  it('regime normale → 15%', () => {
    expect(calculateRetenciones(10000, false)).toBeCloseTo(10000 * 0.15, 2);
  });

  it('default è false (15%)', () => {
    expect(calculateRetenciones(5000)).toBeCloseTo(5000 * 0.15, 2);
  });

  it('arrotondato a 2 decimali', () => {
    const res = calculateRetenciones(333.33, false);
    expect(res).toBe(Math.round(res * 100) / 100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — IVA repercutida / soportada (via calcularTrimestre)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — IVA repercutida / soportada', () => {
  const year = 2026;

  it('ivaRepercutida = somma IVA delle fatture del trimestre', () => {
    const docs = [
      makeInvoice(1000, '2026-01-15', 21), // IVA: 210
      makeInvoice(2000, '2026-02-10', 10), // IVA: 200
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.ivaRepercutida).toBeCloseTo(210 + 200, 1);
  });

  it('ivaSoportada = IVA spese con deducibilità parziale applicata', () => {
    const docs = [
      makeExpense(500, '2026-01-20', 'material', 21), // IVA: 500×100%×21% = 105
      makeExpense(100, '2026-03-01', 'telefono', 21),  // IVA: 100×50%×21% = 10.5 (telefono 50% deducibile)
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.ivaSoportada).toBeCloseTo(105 + 10.5, 1);
  });

  it('diferenciaIVA = repercutida − soportada', () => {
    const docs = [
      makeInvoice(1000, '2026-01-10', 21), // IVA 210
      makeExpense(500, '2026-01-20', 'material', 21),  // IVA 105
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.diferenciaIVA).toBeCloseTo(210 - 105, 1);
  });

  it('factura_rectificativa riduce ivaRepercutida', () => {
    const docs = [
      makeInvoice(1000, '2026-01-10', 21),      // +210
      makeRectificativa(200, '2026-01-20', 21),  // -42
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.ivaRepercutida).toBeCloseTo(210 - 42, 1);
  });

  it('spese senza IVA non contribuiscono a ivaSoportada', () => {
    const docs = [makeExpense(1000, '2026-01-10', 'material', 0)];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.ivaSoportada).toBe(0);
  });

  it('documenti fuori trimestre non sono inclusi', () => {
    const docs = [
      makeInvoice(1000, '2026-01-10', 21), // T1
      makeInvoice(999,  '2026-04-01', 21), // T2 — escluso
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.totalIngresos).toBeCloseTo(1000);
    expect(res.ivaRepercutida).toBeCloseTo(210, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Modelo 130 cumulativo
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — Modelo 130 (calcolo cumulativo)', () => {
  const year = 2026;

  it('T1: base = (ingresos − gastos) × 95% dopo gastos difícil 5%', () => {
    const docs = [
      makeInvoice(5000, '2026-02-01'),
      makeExpense(1000, '2026-02-10', 'material', 0),
    ];
    const res = calcularTrimestre(docs, 1, year);
    // rendimientoNetoPrevio = 4000; gastosDificil = 4000 × 5% = 200; base = 3800
    expect(res.baseImponible130).toBeCloseTo(3800);
    expect(res.cuotaIRPF).toBeCloseTo(3800 * 0.20);
    expect(res.pagosAnteriores).toBe(0);
  });

  it('T2: deduce cuota T1 già versata', () => {
    const docs = [
      makeInvoice(5000, '2026-02-01'), // T1
      makeInvoice(5000, '2026-05-01'), // T2
    ];
    const t1 = calcularTrimestre(docs, 1, year);
    const t2 = calcularTrimestre(docs, 2, year);
    expect(t2.pagosAnteriores).toBeCloseTo(t1.cuotaIRPF, 2);
    expect(t2.cuotaIRPF).toBeCloseTo(t2.cuotaAcumulada - t2.pagosAnteriores, 2);
  });

  it('T3 cumulativo: include T1 + T2 + T3, applica 5% gastos difícil', () => {
    const docs = [
      makeInvoice(3000, '2026-01-15'), // T1
      makeInvoice(3000, '2026-04-15'), // T2
      makeInvoice(3000, '2026-07-15'), // T3
    ];
    const res = calcularTrimestre(docs, 3, year);
    // ingresos cumulativi = 9000; gastosDificil = 9000 × 5% = 450; base = 8550
    expect(res.ingresosCumulativos).toBeCloseTo(9000);
    expect(res.cuotaAcumulada).toBeCloseTo(8550 * 0.20);
  });

  it('exentoMinimo: base < €1.000 → cuotaIRPF = 0 e flag true', () => {
    const docs = [makeInvoice(800, '2026-01-10')];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.exentoMinimo).toBe(true);
    expect(res.cuotaIRPF).toBe(0);
  });

  it('exentoMinimo: ingresos = €1.000 → esente dopo 5% gastos difícil (base netta = €950)', () => {
    // rendimientoNetoPrevio = 1000; gastosDificil = 1000 × 5% = 50; base = 950 < 1000 → esente
    const docs = [makeInvoice(1000, '2026-01-10')];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.exentoMinimo).toBe(true);
    expect(res.cuotaIRPF).toBe(0);
  });

  it('factura_rectificativa riduce gli ingresos cumulativi', () => {
    const docs = [
      makeInvoice(5000, '2026-01-10'),
      makeRectificativa(1000, '2026-02-10'),
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.ingresosCumulativos).toBeCloseTo(4000);
  });

  it('cuotaIRPF non può essere negativa', () => {
    // pagosAnteriores > cuotaAcumulada (reddito calato nel trimestre)
    const docs = [
      makeInvoice(10000, '2026-01-10'), // T1 base 10000
      makeRectificativa(9000, '2026-04-05'), // T2 riduce molto
    ];
    const res = calcularTrimestre(docs, 2, year);
    expect(res.cuotaIRPF).toBeGreaterThanOrEqual(0);
  });

  it('spese con deducibilità parziale (telefono 50%), gastos difícil applicato', () => {
    const docs = [
      makeInvoice(5000, '2026-01-10'),
      makeExpense(2000, '2026-01-20', 'telefono', 0), // deducibile al 50% → 1000
    ];
    const res = calcularTrimestre(docs, 1, year);
    // rendimientoNetoPrevio = 5000 - 1000 = 4000; gastosDificil = 200; base = 3800
    expect(res.gastosCumulativos).toBeCloseTo(1000);
    expect(res.baseImponible130).toBeCloseTo(3800);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Modelo 390 (Resumen Anual IVA — aggregazione 4 trimestri)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — Modelo 390 (aggregazione 4 trimestri)', () => {
  const year = 2026;

  // Helper: simula il calcolo annuale che fa generateResumenAnualIVABlob
  function calcAnualeIVA(docs: Document[]) {
    const yearInvoices = docs.filter(d => d.type === 'invoice' && new Date(d.date).getFullYear() === year);
    const yearRect     = docs.filter(d => d.type === 'factura_rectificativa' && new Date(d.date).getFullYear() === year);
    const yearExpenses = docs.filter(d => d.type === 'expense' && new Date(d.date).getFullYear() === year);

    const totalIvaRep = yearInvoices.reduce((s, d) => s + d.amount * ((d.ivaRate ?? 0) / 100), 0)
                      - yearRect.reduce((s, d) => s + d.amount * ((d.ivaRate ?? 0) / 100), 0);
    const totalIvaSop = yearExpenses
      .filter(d => (d.ivaRate ?? 0) > 0)
      .reduce((s, d) => s + d.amount * ((d.ivaRate ?? 0) / 100), 0);

    const quarters = ([1, 2, 3, 4] as const).map(q => calcularTrimestre(docs, q, year));
    const sumRepFromQuarters = quarters.reduce((s, q) => s + q.ivaRepercutida, 0);
    const sumSopFromQuarters = quarters.reduce((s, q) => s + q.ivaSoportada, 0);

    return { totalIvaRep, totalIvaSop, diferencia: totalIvaRep - totalIvaSop, sumRepFromQuarters, sumSopFromQuarters };
  }

  it('IVA annuale = somma dei 4 trimestri (coerenza path annuale vs trimestrale)', () => {
    const docs = [
      makeInvoice(5000, '2026-01-10', 21), // T1 — rep: 1050
      makeInvoice(3000, '2026-04-15', 21), // T2 — rep: 630
      makeInvoice(4000, '2026-07-20', 21), // T3 — rep: 840
      makeInvoice(2000, '2026-10-05', 21), // T4 — rep: 420
      makeExpense(1000, '2026-02-10', 'material', 21), // T1 — sop: 210
      makeExpense(500,  '2026-08-01', 'material', 21), // T3 — sop: 105
    ];
    const r = calcAnualeIVA(docs);
    // IVA rep: 1050+630+840+420 = 2940; IVA sop: 210+105 = 315
    expect(r.totalIvaRep).toBeCloseTo(2940, 1);
    expect(r.totalIvaSop).toBeCloseTo(315, 1);
    expect(r.sumRepFromQuarters).toBeCloseTo(r.totalIvaRep, 1);
    expect(r.sumSopFromQuarters).toBeCloseTo(r.totalIvaSop, 1);
  });

  it('diferencia annuale = totalIvaRep − totalIvaSop', () => {
    const docs = [
      makeInvoice(5000, '2026-03-01', 21), // rep: 1050
      makeExpense(1000, '2026-03-15', 'material', 21), // sop: 210
    ];
    const r = calcAnualeIVA(docs);
    expect(r.diferencia).toBeCloseTo(1050 - 210, 1); // 840
  });

  it('aggregazione multi-aliquota: 21% + 10% separati per rate', () => {
    const docs = [
      makeInvoice(5000, '2026-01-10', 21), // rep 21%: 1050
      makeInvoice(2000, '2026-04-01', 10), // rep 10%: 200
      makeExpense(1000, '2026-02-01', 'material', 21), // sop 21%: 210
    ];
    const r = calcAnualeIVA(docs);
    expect(r.totalIvaRep).toBeCloseTo(1050 + 200, 1); // 1250
    expect(r.totalIvaSop).toBeCloseTo(210, 1);
    expect(r.diferencia).toBeCloseTo(1040, 1);
  });

  it('factura_rectificativa riduce IVA repercutida annuale', () => {
    const docs = [
      makeInvoice(5000, '2026-01-10', 21),       // +1050
      makeRectificativa(1000, '2026-06-01', 21), // -210
    ];
    const r = calcAnualeIVA(docs);
    expect(r.totalIvaRep).toBeCloseTo(1050 - 210, 1); // 840
    expect(r.sumRepFromQuarters).toBeCloseTo(840, 1);
  });

  it('documenti di anni diversi esclusi dal 390', () => {
    const docs = [
      makeInvoice(10000, '2025-12-31', 21), // anno precedente — escluso
      makeInvoice(5000,  '2026-01-15', 21), // 2026 — incluso
      makeInvoice(3000,  '2027-01-01', 21), // anno successivo — escluso
    ];
    const r = calcAnualeIVA(docs);
    expect(r.totalIvaRep).toBeCloseTo(5000 * 0.21, 1); // solo la fattura 2026
  });

  it('trimestre senza fatture contribuisce con IVA = 0', () => {
    const docs = [
      makeInvoice(5000, '2026-01-10', 21), // solo T1
    ];
    const quarters = ([1, 2, 3, 4] as const).map(q => calcularTrimestre(docs, q, year));
    expect(quarters[0].ivaRepercutida).toBeCloseTo(1050, 1); // T1
    expect(quarters[1].ivaRepercutida).toBe(0);              // T2
    expect(quarters[2].ivaRepercutida).toBe(0);              // T3
    expect(quarters[3].ivaRepercutida).toBe(0);              // T4
  });

  it('IVA soportada > repercutida → diferencia negativa (a devolver)', () => {
    const docs = [
      makeInvoice(1000, '2026-01-10', 21),  // rep: 210
      makeExpense(5000, '2026-01-20', 'material', 21), // sop: 1050
    ];
    const r = calcAnualeIVA(docs);
    expect(r.diferencia).toBeLessThan(0); // a devolver
    expect(r.diferencia).toBeCloseTo(210 - 1050, 1); // -840
  });

  it('nessun documento → tutto zero', () => {
    const r = calcAnualeIVA([]);
    expect(r.totalIvaRep).toBe(0);
    expect(r.totalIvaSop).toBe(0);
    expect(r.diferencia).toBe(0);
    expect(r.sumRepFromQuarters).toBe(0);
    expect(r.sumSopFromQuarters).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Deductibility rates
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — getEsDeductibilityRate', () => {
  it('categorie al 100%: material, suscripcion, software, formacion', () => {
    expect(getEsDeductibilityRate('material')).toBe(1);
    expect(getEsDeductibilityRate('suscripcion')).toBe(1);
    expect(getEsDeductibilityRate('software')).toBe(1);
    expect(getEsDeductibilityRate('formacion')).toBe(1);
  });

  it('telefono → 50%', () => {
    expect(getEsDeductibilityRate('telefono')).toBe(0.5);
  });

  it('categorie legacy (italiano) → 100%', () => {
    expect(getEsDeductibilityRate('abbonamento')).toBe(1);
    expect(getEsDeductibilityRate('materiale')).toBe(1);
  });

  it('categoria sconosciuta → 100% (default conservativo)', () => {
    expect(getEsDeductibilityRate('qualcosa_sconosciuto')).toBe(1);
  });

  it('undefined → 100%', () => {
    expect(getEsDeductibilityRate(undefined)).toBe(1);
  });

  it('case insensitive', () => {
    expect(getEsDeductibilityRate('TELEFONO')).toBe(0.5);
    expect(getEsDeductibilityRate('Material')).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Reducción inicio actividad (art. 32.3 LIRPF)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — getReduccionInicio (art. 32.3 LIRPF)', () => {
  it('primo anno di attività → 20%', () => {
    expect(getReduccionInicio(2026, 2026)).toBe(0.20);
  });

  it('secondo anno → 30%', () => {
    expect(getReduccionInicio(2025, 2026)).toBe(0.30);
  });

  it('terzo anno e oltre → 0%', () => {
    expect(getReduccionInicio(2024, 2026)).toBe(0);
    expect(getReduccionInicio(2020, 2026)).toBe(0);
  });

  it('startYear undefined → 0%', () => {
    expect(getReduccionInicio(undefined, 2026)).toBe(0);
  });
});

describe('Spain — calculateSpanishTaxes con reducción inicio', () => {
  const grossIncome = 30000;
  const currentYear = 2026;

  it('primo anno: IRPF calcolato su base ridotta del 20%', () => {
    const startYear = 2026;
    // rendimientoNetoPrevio = 30000, gastosDificil = 1500, rendimientoNetoPrelim = 28500
    // reduccion 20% → rendimientoNeto = 28500 × 0.80 = 22800
    const r = calculateSpanishTaxes(grossIncome, false, false, startYear, currentYear, 0);
    expect(r.reduccionInicioRate).toBe(0.20);
    expect(r.rendimientoNeto).toBeCloseTo(22800, 0);
    // IRPF su 22800: 12450×19% + (20200-12450)×24% + (22800-20200)×30%
    const irpfExpected = 12450 * 0.19 + 7750 * 0.24 + 2600 * 0.30;
    expect(r.irpf).toBeCloseTo(irpfExpected, 0);
  });

  it('secondo anno: IRPF calcolato su base ridotta del 30%', () => {
    const startYear = 2025;
    // rendimientoNetoPrelim = 28500, reduccion 30% → rendimientoNeto = 19950
    const r = calculateSpanishTaxes(grossIncome, false, false, startYear, currentYear, 0);
    expect(r.reduccionInicioRate).toBe(0.30);
    expect(r.rendimientoNeto).toBeCloseTo(28500 * 0.70, 0);
  });

  it('anno normale: nessuna reducción', () => {
    const startYear = 2020;
    const r = calculateSpanishTaxes(grossIncome, false, false, startYear, currentYear, 0);
    expect(r.reduccionInicioRate).toBe(0);
    expect(r.rendimientoNeto).toBeCloseTo(30000 - 1500, 0); // 28500
  });

  it('mesesDeAlta = 6: RETA annuale è metà di quella a 12 mesi', () => {
    const r12 = calculateSpanishTaxes(grossIncome, false, false, undefined, currentYear, 0, 12);
    const r6  = calculateSpanishTaxes(grossIncome, false, false, undefined, currentYear, 0, 6);
    expect(r6.reta).toBeCloseTo(r12.reta / 2, 1);
  });
});

describe('Spain — Reducción inicio in calcularTrimestre (Modelo 130)', () => {
  const year = 2026;

  it('primo anno: cuotaIRPF ridotta del 20% rispetto a senza reducción', () => {
    const docs = [
      makeInvoice(10000, '2026-01-10', 21),
    ];
    const rSenza = calcularTrimestre(docs, 1, year, 0);          // senza startYear
    const rCon   = calcularTrimestre(docs, 1, year, 0, 2026);    // primo anno
    // Con reducción, cuota = baseConReduccion × 20% invece di base × 20%
    expect(rCon.cuotaIRPF).toBeLessThan(rSenza.cuotaIRPF);
    expect(rCon.reduccionInicioRate).toBe(0.20);
  });

  it('anno normale: reduccionInicioRate = 0, cuota invariata', () => {
    const docs = [makeInvoice(10000, '2026-01-10', 21)];
    const r = calcularTrimestre(docs, 1, year, 0, 2020);
    expect(r.reduccionInicioRate).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — IVA soportada con deducibilità parziale
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — IVA soportada parziale (telefono 50%)', () => {
  const year = 2026;

  it('telefono: solo il 50% dell IVA è deducibile', () => {
    const docs = [
      makeExpense(1000, '2026-01-10', 'telefono', 21), // IVA: 1000×50%×21% = 105
    ];
    const r = calcularTrimestre(docs, 1, year);
    expect(r.ivaSoportada).toBeCloseTo(105, 1);
  });

  it('material 100% + telefono 50% = somma corretta', () => {
    const docs = [
      makeExpense(1000, '2026-01-10', 'material', 21), // IVA: 210
      makeExpense(1000, '2026-01-10', 'telefono', 21), // IVA: 105
    ];
    const r = calcularTrimestre(docs, 1, year);
    expect(r.ivaSoportada).toBeCloseTo(210 + 105, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPAIN — Operazioni intracomunitarie
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — getMesesDeAlta (RETA proporzionale)', () => {
  it('anno diverso da startYear → sempre 12', () => {
    expect(getMesesDeAlta(2025, 1, 2026)).toBe(12);
    expect(getMesesDeAlta(2025, 6, 2026)).toBe(12);
    expect(getMesesDeAlta(2024, 12, 2026)).toBe(12);
  });

  it('nessun startYear → 12', () => {
    expect(getMesesDeAlta(undefined, undefined, 2026)).toBe(12);
  });

  it('stesso anno, mese non noto → 12 (stima conservativa)', () => {
    expect(getMesesDeAlta(2026, undefined, 2026)).toBe(12);
  });

  it('stesso anno, Enero (1) → 12 mesi', () => {
    expect(getMesesDeAlta(2026, 1, 2026)).toBe(12);
  });

  it('stesso anno, Julio (7) → 6 mesi', () => {
    expect(getMesesDeAlta(2026, 7, 2026)).toBe(6);
  });

  it('stesso anno, Diciembre (12) → 1 mese', () => {
    expect(getMesesDeAlta(2026, 12, 2026)).toBe(1);
  });

  it('RETA annuale con inizio a luglio è metà rispetto a inizio gennaio', () => {
    const rJan = calculateSpanishTaxes(20000, false, false, 2026, 2026, 0, getMesesDeAlta(2026, 1, 2026));
    const rJul = calculateSpanishTaxes(20000, false, false, 2026, 2026, 0, getMesesDeAlta(2026, 7, 2026));
    expect(rJul.reta).toBeCloseTo(rJan.reta / 2, 1);
  });
});

describe('Spain — Operazioni intracomunitarie (inversión del sujeto pasivo)', () => {
  const year = 2026;

  it('fattura intracomunitaria non contribuisce a ivaRepercutida', () => {
    const docs = [
      makeInvoice(1000, '2026-01-10', 21),          // IVA 210
      makeIntracomunitaria(2000, '2026-02-15'),       // IVA 0 — esclusa
    ];
    const r = calcularTrimestre(docs, 1, year);
    expect(r.ivaRepercutida).toBeCloseTo(210, 1);   // solo la normale
  });

  it('solo intracomunitarie: ivaRepercutida = 0', () => {
    const docs = [
      makeIntracomunitaria(5000, '2026-01-10'),
      makeIntracomunitaria(3000, '2026-02-20'),
    ];
    const r = calcularTrimestre(docs, 1, year);
    expect(r.ivaRepercutida).toBe(0);
  });

  it('intracomunitaria entra nel totalIngresos (base IRPF)', () => {
    const docs = [
      makeInvoice(1000, '2026-01-10', 21),
      makeIntracomunitaria(2000, '2026-01-20'),
    ];
    const r = calcularTrimestre(docs, 1, year);
    // totalIngresos include entrambe (l'intracomunitaria è comunque reddito)
    expect(r.totalIngresos).toBeCloseTo(3000, 1);
  });
});
