-- T11: Fix flusso onboarding — profilo vuoto senza default paese
-- Elimina i DEFAULT su country e regime: il trigger crea profilo con
-- country=NULL e regime=NULL. L'app mostra l'onboarding quando country=NULL.
-- Esegui questo script nell'SQL Editor di Supabase (è idempotente).

-- 1. Rimuovi DEFAULT 'Italy' — il paese va scelto dall'utente in onboarding
ALTER TABLE profiles ALTER COLUMN country DROP DEFAULT;

-- 2. Rimuovi DEFAULT 'forfettario' — dipende dal paese scelto
ALTER TABLE profiles ALTER COLUMN regime DROP DEFAULT;

-- 3. Ricrea la funzione trigger: inserisce solo i campi minimi obbligatori.
--    country e regime saranno NULL finché l'utente non completa l'onboarding.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, currency, is_pro, theme)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    'EUR',
    FALSE,
    'light'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ricrea il trigger (DROP + CREATE per essere idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
