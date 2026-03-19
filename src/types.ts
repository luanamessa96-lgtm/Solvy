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
