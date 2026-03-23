-- T9: Aggiunge colonne mancanti alla tabella profiles
-- Esegui questo script nell'SQL Editor di Supabase
-- È sicuro da rieseguire (IF NOT EXISTS)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS anno_inizio_attivita INTEGER,
  ADD COLUMN IF NOT EXISTS coefficiente NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Italy',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS piva TEXT,
  ADD COLUMN IF NOT EXISTS codice_fiscale TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS regime TEXT DEFAULT 'forfettario',
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
