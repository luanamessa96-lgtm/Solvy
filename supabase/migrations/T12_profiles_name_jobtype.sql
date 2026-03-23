-- T12: Aggiunge colonne name e job_type mancanti alla tabella profiles
-- Fix per PGRST204 — colonne inviate dal client ma assenti nello schema DB.
-- È sicuro da rieseguire (IF NOT EXISTS).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_type TEXT;
