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
    const expectedTaxable = 30000 * 0.78; // 23400
    expect(result.taxableIncome).toBeCloseTo(expectedTaxable);
    expect(result.incomeTax).toBeCloseTo(expectedTaxable * 0.05);
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
    expect(result.incomeTax).toBeCloseTo(expectedTaxable * 0.15);
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
    // IRPEF lorda: 20000 * 23% = 4600 + addizionale regionale 2.3% = 460
    const expectedIRPEF = 20000 * 0.23;
    const expectedAddl = 20000 * 0.023;
    expect(result.incomeTax).toBeCloseTo(expectedIRPEF + expectedAddl, 0);
  });

  it('scaglione 28.001–50.000 → 23% + 35%', () => {
    const result = italyModule.calculateTax({ grossIncome: 40000, regime: 'ordinario' });
    const irpef = 28000 * 0.23 + (40000 - 28000) * 0.35;
    const addl = 40000 * 0.023;
    expect(result.incomeTax).toBeCloseTo(irpef + addl, 0);
  });

  it('scaglione oltre 50.000 → 23% + 35% + 43%', () => {
    const result = italyModule.calculateTax({ grossIncome: 70000, regime: 'ordinario' });
    const irpef = 28000 * 0.23 + 22000 * 0.35 + (70000 - 50000) * 0.43;
    const addl = 70000 * 0.023;
    expect(result.incomeTax).toBeCloseTo(irpef + addl, 0);
  });

  it('INPS ordinario al 24%', () => {
    const result = italyModule.calculateTax({ grossIncome: 30000, regime: 'ordinario' });
    expect(result.socialContributions).toBeCloseTo(30000 * 0.24);
  });

  it('effectiveRate coerente con i calcoli', () => {
    const result = italyModule.calculateTax({ grossIncome: 50000, regime: 'ordinario' });
    const expected = (result.incomeTax + result.socialContributions) / result.grossIncome;
    expect(result.effectiveRate).toBeCloseTo(expected, 5);
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

  it('ordinario: contributi su reddito lordo al 24%', () => {
    const res = italyModule.calculateContributions({ grossIncome: 50000, regime: 'ordinario', categoryCoeff: 0.78 });
    expect(res.annual).toBeCloseTo(50000 * 0.24, 0);
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
// SPAIN — RETA (fasce 2023)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Spain — calculateRETA', () => {
  it('reddito mensile ≤ 670 → €230/mese', () => {
    expect(calculateRETA(500)).toBe(230);
  });

  it('reddito mensile 671–900 → €260/mese', () => {
    expect(calculateRETA(800)).toBe(260);
  });

  it('reddito mensile 901–1.166 → €275/mese', () => {
    expect(calculateRETA(1000)).toBe(275);
  });

  it('reddito mensile 1.167–1.300 → €294/mese', () => {
    expect(calculateRETA(1250)).toBe(294);
  });

  it('reddito mensile 1.301–1.500 → €320/mese', () => {
    expect(calculateRETA(1400)).toBe(320);
  });

  it('reddito mensile 1.501–1.700 → €350/mese', () => {
    expect(calculateRETA(1600)).toBe(350);
  });

  it('reddito mensile 1.701–1.850 → €370/mese', () => {
    expect(calculateRETA(1800)).toBe(370);
  });

  it('reddito mensile 1.851–2.030 → €390/mese', () => {
    expect(calculateRETA(2000)).toBe(390);
  });

  it('reddito mensile > 2.030 → €500/mese', () => {
    expect(calculateRETA(3000)).toBe(500);
    expect(calculateRETA(10000)).toBe(500);
  });

  it('reddito zero → fascia minima €230', () => {
    expect(calculateRETA(0)).toBe(230);
  });

  it('tutte le fasce coperte (nessun buco)', () => {
    // Verifica che ogni limite di fascia ricada nella fascia corretta
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

describe('Spain — Tarifa Plana', () => {
  const currentYear = 2026;

  it('startYear undefined → normal', () => {
    expect(getTarifaPlanaStatus(undefined, currentYear, 20000)).toBe('normal');
  });

  it('primo anno (< 1 anno) → year1 indipendentemente dal reddito', () => {
    expect(getTarifaPlanaStatus(2026, currentYear, 100000)).toBe('year1');
  });

  it('secondo anno + reddito sotto soglia → year2_below_threshold', () => {
    expect(getTarifaPlanaStatus(2025, currentYear, 8000)).toBe('year2_below_threshold');
  });

  it('secondo anno + reddito sopra soglia → normal', () => {
    expect(getTarifaPlanaStatus(2025, currentYear, 15000)).toBe('normal');
  });

  it('terzo anno → normal indipendentemente dal reddito', () => {
    expect(getTarifaPlanaStatus(2024, currentYear, 5000)).toBe('normal');
  });

  it('calculateRETA_withTarifaPlana: year1 → €80/mese', () => {
    const { monthly, status } = calculateRETA_withTarifaPlana(1000, 2026, currentYear, 20000);
    expect(monthly).toBe(80);
    expect(status).toBe('year1');
  });

  it('calculateRETA_withTarifaPlana: normal → quota fascia standard', () => {
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

  it('ivaSoportada = somma IVA delle spese del trimestre', () => {
    const docs = [
      makeExpense(500, '2026-01-20', 'material', 21), // IVA: 105
      makeExpense(100, '2026-03-01', 'telefono', 21),  // IVA: 21
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.ivaSoportada).toBeCloseTo(105 + 21, 1);
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

  it('T1: base = ingresos − gastos, cuota = 20%', () => {
    const docs = [
      makeInvoice(5000, '2026-02-01'),
      makeExpense(1000, '2026-02-10', 'material', 0),
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.baseImponible130).toBeCloseTo(4000);
    expect(res.cuotaIRPF).toBeCloseTo(4000 * 0.20);
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

  it('T3 cumulativo: include T1 + T2 + T3', () => {
    const docs = [
      makeInvoice(3000, '2026-01-15'), // T1
      makeInvoice(3000, '2026-04-15'), // T2
      makeInvoice(3000, '2026-07-15'), // T3
    ];
    const res = calcularTrimestre(docs, 3, year);
    expect(res.ingresosCumulativos).toBeCloseTo(9000);
    expect(res.cuotaAcumulada).toBeCloseTo(9000 * 0.20);
  });

  it('exentoMinimo: base < €1.000 → cuotaIRPF = 0 e flag true', () => {
    const docs = [makeInvoice(800, '2026-01-10')];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.exentoMinimo).toBe(true);
    expect(res.cuotaIRPF).toBe(0);
  });

  it('exentoMinimo: base = €1.000 → NON esente (bordo superiore)', () => {
    const docs = [makeInvoice(1000, '2026-01-10')];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.exentoMinimo).toBe(false);
    expect(res.cuotaIRPF).toBeCloseTo(1000 * 0.20);
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

  it('spese con deducibilità parziale (telefono 50%)', () => {
    const docs = [
      makeInvoice(5000, '2026-01-10'),
      makeExpense(2000, '2026-01-20', 'telefono', 0), // deducibile al 50% → 1000
    ];
    const res = calcularTrimestre(docs, 1, year);
    expect(res.gastosCumulativos).toBeCloseTo(1000);
    expect(res.baseImponible130).toBeCloseTo(4000);
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
