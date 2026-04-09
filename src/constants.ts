import { Profile, Document, Deadline, Accountant } from './types';

export const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Utente',
    email: '',
    country: 'Italy',
    currency: 'EUR',
    jobType: 'Freelance',
  },
  {
    id: '2',
    name: 'Profilo 2',
    email: '',
    country: 'Italy',
    currency: 'EUR',
    jobType: 'Freelance',
  }
];

export const MOCK_DOCUMENTS: Document[] = [
  { id: '1', type: 'invoice', title: 'Fattura #001', amount: 1200, date: '2026-01-08', status: 'paid', client: 'Devon Lane' },
  { id: '2', type: 'invoice', title: 'Fattura #002', amount: 850, date: '2026-02-09', status: 'pending', client: 'Floyd Miles' },
  { id: '3', type: 'expense', title: 'Abbonamento Adobe', amount: 60, date: '2026-03-10', status: 'paid' },
  { id: '4', type: 'invoice', title: 'Fattura #003', amount: 2100, date: '2026-03-11', status: 'draft', client: 'Ronald Richards' },
];

export const MOCK_DEADLINES: Deadline[] = [
  { id: '1', title: 'IVA Trimestrale', date: '2024-06-16', type: 'tax', amount: 450.50 },
  { id: '2', title: 'Pagamento Server', date: '2024-05-25', type: 'payment', amount: 25.00 },
  { id: '3', title: 'Contributi INPS', date: '2024-05-16', type: 'tax', amount: 1200.00 },
];

export const MOCK_ACCOUNTANT: Accountant = {
  firstName: 'Marco',
  lastName: 'Rossi',
  office: '',
  contractDetails: '',
  sendingInstructions: '',
  email: 'm.rossi@studiorossi.it',
  phone: '+39 02 1234567'
};
