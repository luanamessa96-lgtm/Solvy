export type Currency = 'EUR' | 'USD' | 'GBP';
export type Country = 'Italy' | 'USA' | 'UK' | 'Germany' | 'Spain';

export interface Profile {
  id: string;
  name: string;
  email: string;
  country: Country;
  currency: Currency;
  jobType: string;
  avatar?: string;
  address?: string;
  piva?: string;
  nie?: string;
  codiceFiscale?: string;
  regime?: 'forfettario' | 'ordinario' | 'autonomo';
  coefficiente?: number;
  annoInizioAttivita?: number;
  meseInizioAttivita?: number; // 1–12 — mese di iscrizione RETA, per calcolo proporzionale nel primo anno
  iban?: string;
  isPro?: boolean;
  subscriptionStartedAt?: string;
  subscriptionPlan?: 'monthly' | 'yearly';
  regimenFiscal?: 'simplificada' | 'normal' | 'modulos';
  ivaHabitual?: 21 | 10 | 4 | 7 | 3 | 0;
  street?: string;
  cap?: string;
  city?: string;
  province?: string;
  region?: string;
  territory?: 'peninsula' | 'canarias';
  redditoN1?: number;
  invoiceCounters?: Record<string, number>;
  deletedInvoiceNumbers?: string[];
  hasOstativaCause?: boolean;
}

export interface Document {
  id: string;
  type: 'invoice' | 'expense' | 'credit_note' | 'proforma' | 'factura_rectificativa' | 'presupuesto';
  title: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  client?: string;
  category?: string;
  imageData?: string;
  fileName?: string;
  invoiceNumber?: string;
  clientAddress?: string;
  clientPiva?: string;
  clientCf?: string;
  ritenuta?: boolean;
  marcaBollo?: boolean;
  ivaRate?: number;
  rivalsaInps?: boolean;
  docRegime?: 'forfettario' | 'ordinario';
  clientSdi?: string;
  clientPec?: string;
  sdiStatus?: 'sent' | 'delivered' | 'rejected' | 'failed';
  validezDate?: string;
  intracomunitaria?: boolean;
  nifProveedor?: string;
}

export interface Deadline {
  id: string;
  title: string;
  date: string;
  type: 'tax' | 'payment' | 'other';
  amount?: number;
  completed?: boolean;
}

export interface Accountant {
  firstName: string;
  lastName: string;
  office: string;
  contractDetails: string;
  sendingInstructions: string;
  email: string;
  phone: string;
}
