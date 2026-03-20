-- T8: Aggiunge colonna updated_at per sincronizzazione robusta
-- Esegui questo script nell'SQL Editor di Supabase

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE deadlines
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Imposta updated_at per le righe esistenti
UPDATE documents SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE deadlines SET updated_at = NOW() WHERE updated_at IS NULL;
