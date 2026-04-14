import { Profile, Accountant } from './types';

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


export const MOCK_ACCOUNTANT: Accountant = {
  firstName: 'Marco',
  lastName: 'Rossi',
  office: '',
  contractDetails: '',
  sendingInstructions: '',
  email: 'm.rossi@studiorossi.it',
  phone: '+39 02 1234567'
};
