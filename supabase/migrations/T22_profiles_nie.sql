-- T22: Aggiunge colonna nie alla tabella profiles
-- Il NIE spagnolo era salvato solo in localStorage — ora persiste nel DB.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nie TEXT;
