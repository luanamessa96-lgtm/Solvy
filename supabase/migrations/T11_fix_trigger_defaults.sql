-- T11: Fix flusso onboarding — profilo vuoto senza default paese
-- Elimina i DEFAULT su country e regime: il trigger crea profilo con
-- country=NULL e regime=NULL. L'app mostra l'onboarding quando country=NULL.
-- Esegui questo script nell'SQL Editor di Supabase (è idempotente).

-- 1. Rimuovi DEFAULT 'Italy' — il paese va scelto dall'utente in onboarding
ALTER TABLE profiles ALTER COLUMN country DROP DEFAULT;

-- 2. Rimuovi DEFAULT 'forfettario' — dipende dal paese scelto
ALTER TABLE profiles ALTER COLUMN regime DROP DEFAULT;

-- 3. Aggiungi colonna email a profiles se mancante
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- 4. Ricrea la funzione trigger in modo difensivo.
--    Inserisce solo id e user_id (minimo garantito).
--    Se fallisce per qualsiasi motivo, logga e non blocca auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id)
  VALUES (NEW.id, NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ricrea il trigger (DROP + CREATE per essere idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
