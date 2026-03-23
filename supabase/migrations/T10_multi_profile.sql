-- T10: Supporto multi-profilo
-- La tabella profiles usava id = auth.users.id (un profilo per utente).
-- Questa migration la trasforma per supportare N profili per utente:
--   - Rimuove FK da profiles.id → auth.users
--   - Aggiunge FK da profiles.user_id → auth.users
--   - Aggiorna RLS: ora usa user_id = auth.uid()
-- È sicura da rieseguire (IF NOT EXISTS / IF EXISTS)

-- 1. Rimuovi FK esistente su profiles.id (Supabase la chiama profiles_id_fkey)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Assicurati che user_id esista (potrebbe essere già presente)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Popola user_id dove è NULL (vecchi profili dove id = auth user uuid)
UPDATE profiles SET user_id = id WHERE user_id IS NULL;

-- 4. Aggiungi FK su user_id → auth.users (se non esiste già)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Aggiorna RLS policies — rimuovi le vecchie (basate su id) e crea le nuove (user_id)
DROP POLICY IF EXISTS "Users can view own profile." ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile." ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Nuove policy basate su user_id
CREATE POLICY IF NOT EXISTS "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "profiles_delete" ON profiles
  FOR DELETE USING (auth.uid() = user_id);
