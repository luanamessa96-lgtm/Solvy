import { Profile } from '../types';

/**
 * Restituisce true se il profilo attivo ha un abbonamento Pro attivo.
 * Legge is_pro dal profilo caricato da Supabase tramite getProfiles().
 * Aggiornato automaticamente quando activeProfile cambia (post-pagamento Stripe).
 */
export function useProStatus(profile: Profile | null | undefined): boolean {
  return profile?.isPro ?? false;
}
