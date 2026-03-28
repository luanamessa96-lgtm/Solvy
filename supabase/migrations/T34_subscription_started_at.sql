-- T34: Aggiunge subscription_started_at per tracciare la data del primo pagamento
-- Necessario per il diritto di recesso 14 giorni (art. 6.4 Termini di Servizio)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
