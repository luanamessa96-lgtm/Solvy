-- T16: Abilita Realtime sulla tabella profiles
-- Necessario per aggiornare is_pro nel client React senza refresh
-- quando il webhook Stripe aggiorna il DB dopo il pagamento.
--
-- REPLICA IDENTITY FULL: include tutti i campi negli eventi UPDATE
-- (senza FULL i campi non modificati mancano nel payload Realtime con RLS).
-- Aggiunge profiles alla publication supabase_realtime.

ALTER TABLE profiles REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
