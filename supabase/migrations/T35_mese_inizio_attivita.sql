-- T35: mese de inicio de actividad — per calcolo RETA proporzionale nel primo anno
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mese_inizio_attivita INTEGER CHECK (mese_inizio_attivita BETWEEN 1 AND 12);
