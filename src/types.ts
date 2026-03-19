export type Currency = 'EUR' | 'USD' | 'GBP';
export type Country = 'Italy' | 'USA' | 'UK' | 'Germany';

export interface Profile {
  id: string;
  name: string;
  email: string;
  country: Country;
  currency: Currency;
  jobType: string;
  avatar: string;
  address?: string;
  piva?: string;
  codiceFiscale?: string;
  regime?: 'forfettario' | 'ordinario';
}

export interface Document {
  id: string;
  type: 'invoice' | 'expense';
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
}

export interface Deadline {
  id: string;
  title: string;
  date: string;
  type: 'tax' | 'payment' | 'other';
  amount?: number;
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
