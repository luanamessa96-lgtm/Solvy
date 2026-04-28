-- T37: aggiunge campo territory per supporto Isole Canarie
-- Default 'peninsula' garantisce backward-compat con tutti i profili esistenti.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS territory TEXT
    NOT NULL DEFAULT 'peninsula'
    CHECK (territory IN ('peninsula', 'canarias'));

COMMENT ON COLUMN profiles.territory IS
  'Territorio fiscale ES: peninsula (IVA standard) | canarias (IGIC)';
