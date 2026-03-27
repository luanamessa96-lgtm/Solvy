-- T23: Spain fiscal fields — regimen_fiscal and iva_habitual
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS regimen_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS iva_habitual   INTEGER;
