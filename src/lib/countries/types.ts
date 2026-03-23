export interface TaxInput {
  grossIncome: number;
  regime?: string;
  categoryCoeff?: number; // Italian forfettario
  startYear?: number;     // Italian 5% vs 15%
  isFirstThreeYears?: boolean; // Spanish retenciones
  applyRetenciones?: boolean;
  monthlyNetIncome?: number;
}

export interface TaxResult {
  grossIncome: number;
  taxableIncome: number;
  incomeTax: number;       // IRPEF (IT) or IRPF (ES)
  socialContributions: number; // INPS (IT) or RETA (ES)
  vatRate: number;
  netIncome: number;
  effectiveRate: number;
  details: Record<string, number | string>;
}

export interface ContributionsResult {
  monthly: number;
  annual: number;
  label: string;
}

export interface FiscalDeadline {
  title: string;
  date: string; // YYYY-MM-DD
  type: 'trimestrale' | 'annuale' | 'mensile';
  amount?: number;
}

export interface ValidationRules {
  taxId: {
    label: string;
    placeholder: string;
    validate: (value: string) => boolean;
    errorMessage: string;
  };
  secondaryTaxId?: {
    label: string;
    placeholder: string;
    validate: (value: string) => boolean;
    errorMessage: string;
    optional: boolean;
  };
  iban: {
    validate: (value: string) => boolean;
    errorMessage: string;
  };
}

export interface InvoiceTerms {
  labels: {
    invoice: string;
    provider: string;
    client: string;
    taxableAmount: string;
    vat: string;
    withholding: string;
    total: string;
    invoiceNumber: (num: string | number, year: number) => string;
  };
  legalNote: string;
  showBollo: boolean;
}

export interface CountryModule {
  code: string;
  name: string;
  currency: string;
  language: string;
  vatRates: number[];
  defaultVatRate: number;
  taxRegimes: { value: string; label: string }[];
  getDeadlines: (year: number) => FiscalDeadline[];
  validation: ValidationRules;
  invoiceTerms: InvoiceTerms;
  calculateTax: (input: TaxInput) => TaxResult;
  calculateContributions: (input: TaxInput) => ContributionsResult;
}
