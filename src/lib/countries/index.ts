import type { CountryModule } from './types';
import { italyModule } from './it';
import { spainModule } from './es';

// TODO: for future countries, add lazy loading with import()
const COUNTRY_MODULES: Record<string, CountryModule> = {
  'Italy': italyModule,
  'Spain': spainModule,
};

export function getCountryModule(country: string): CountryModule {
  return COUNTRY_MODULES[country] ?? italyModule;
}

export type { CountryModule, TaxInput, TaxResult, ContributionsResult, FiscalDeadline, ValidationRules, InvoiceTerms } from './types';
