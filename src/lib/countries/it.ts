import type { CountryModule, TaxInput, TaxResult, ContributionsResult, FiscalDeadline } from './types';

// Italian fiscal logic — wraps and mirrors the existing calculations in DashboardView
// NEVER modify these rates without matching the Italian tax authority rules

function validateCodiceFiscale(cf: string): boolean {
  // Italian codice fiscale is 16 alphanumeric chars
  return /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST]{1}[0-9LMNPQRSTUV]{2}[A-Z]{1}[0-9LMNPQRSTUV]{3}[A-Z]{1}$/i.test(cf.trim());
}

function validateIBAN_IT(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.startsWith('IT') && cleaned.length === 27;
}

function getItalianDeadlines(year: number): FiscalDeadline[] {
  return [
    { title: 'Acconto IRPEF (prima rata)', date: `${year}-06-30`, type: 'annuale' },
    { title: 'Acconto IRPEF (seconda rata)', date: `${year}-11-30`, type: 'annuale' },
    { title: 'Saldo IRPEF', date: `${year}-06-30`, type: 'annuale' },
    { title: 'INPS Gestione Separata — acconto', date: `${year}-06-30`, type: 'annuale' },
    { title: 'INPS Gestione Separata — saldo', date: `${year}-11-30`, type: 'annuale' },
    { title: 'Dichiarazione dei redditi (730/Redditi)', date: `${year}-11-30`, type: 'annuale' },
  ];
}

export const italyModule: CountryModule = {
  code: 'IT',
  name: 'Italia',
  currency: 'EUR',
  language: 'it',
  vatRates: [0, 4, 5, 10, 22],
  defaultVatRate: 22,
  taxRegimes: [
    { value: 'forfettario', label: 'Regime Forfettario' },
    { value: 'ordinario', label: 'Regime Ordinario' },
  ],
  getDeadlines: getItalianDeadlines,
  validation: {
    taxId: {
      label: 'Partita IVA / Codice Fiscale',
      placeholder: 'RSSMRA80A01H501Z',
      validate: (v) => v.length >= 11,
      errorMessage: 'Partita IVA o Codice Fiscale non valido',
    },
    iban: {
      validate: validateIBAN_IT,
      errorMessage: 'IBAN italiano non valido (deve iniziare con IT, 27 caratteri)',
    },
  },
  invoiceTerms: {
    labels: {
      invoice: 'Fattura',
      provider: 'Fornitore',
      client: 'Cliente',
      taxableAmount: 'Imponibile',
      vat: 'IVA',
      withholding: 'Ritenuta d\'acconto',
      total: 'Totale',
      invoiceNumber: (num, year) => `${year}-${String(num).padStart(3, '0')}`,
    },
    legalNote: 'Operazione effettuata ai sensi dell\'art. 1, commi 54-89, L. 190/2014 — Regime Forfettario. Imposta non dovuta.',
    showBollo: true,
  },
  calculateTax: (input: TaxInput): TaxResult => {
    const { grossIncome = 0, regime = 'forfettario', categoryCoeff = 0.78, startYear } = input;

    if (regime === 'forfettario') {
      const taxableIncome = grossIncome * categoryCoeff;
      const currentYear = new Date().getFullYear();
      const yearsInBusiness = startYear ? currentYear - startYear : 10;
      const taxRate = yearsInBusiness < 5 ? 0.05 : 0.15;
      const incomeTax = taxableIncome * taxRate;
      const inps = taxableIncome * 0.2607;
      const netIncome = grossIncome - incomeTax - inps;
      return {
        grossIncome,
        taxableIncome,
        incomeTax,
        socialContributions: inps,
        vatRate: 0,
        netIncome,
        effectiveRate: grossIncome > 0 ? (incomeTax + inps) / grossIncome : 0,
        details: {
          regime: 'forfettario',
          coefficiente: categoryCoeff,
          aliquota: taxRate,
          inps,
        },
      };
    } else {
      // Regime ordinario — IRPEF brackets (mirrors calcIRPEF in DashboardView)
      let incomeTax = 0;
      if (grossIncome <= 28000) incomeTax = grossIncome * 0.23;
      else if (grossIncome <= 50000) incomeTax = 28000 * 0.23 + (grossIncome - 28000) * 0.35;
      else incomeTax = 28000 * 0.23 + 22000 * 0.35 + (grossIncome - 50000) * 0.43;
      const regionalAddl = grossIncome * 0.023;
      const totalIncomeTax = incomeTax + regionalAddl;
      const inps = grossIncome * 0.24;
      const netIncome = grossIncome - totalIncomeTax - inps;
      return {
        grossIncome,
        taxableIncome: grossIncome,
        incomeTax: totalIncomeTax,
        socialContributions: inps,
        vatRate: 22,
        netIncome,
        effectiveRate: grossIncome > 0 ? (totalIncomeTax + inps) / grossIncome : 0,
        details: { regime: 'ordinario', irpef: incomeTax, addizionaleRegionale: regionalAddl, inps },
      };
    }
  },
  calculateContributions: (input: TaxInput): ContributionsResult => {
    const { grossIncome = 0, regime = 'forfettario', categoryCoeff = 0.78 } = input;
    const taxableIncome = regime === 'forfettario' ? grossIncome * categoryCoeff : grossIncome;
    const annual = taxableIncome * (regime === 'forfettario' ? 0.2607 : 0.24);
    return {
      monthly: annual / 12,
      annual,
      label: 'INPS Gestione Separata',
    };
  },
};

export default italyModule;
