-- T15: Abilita Row Level Security su tutte le tabelle pubbliche
-- Protegge profiles (inclusi stripe_customer_id e is_pro), documents, deadlines, accountant.
-- Le Edge Functions usano service_role key → bypassano RLS per design.
-- Il trigger handle_new_user() è SECURITY DEFINER → bypassa RLS per design.

-- ============================================================
-- PROFILES
-- Ownership diretta: user_id = auth.uid()
-- Copre anche le colonne Stripe: stripe_customer_id, is_pro
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- DOCUMENTS
-- Ownership indiretta: profile_id → profiles.user_id
-- ============================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_delete" ON documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- ============================================================
-- DEADLINES
-- Ownership indiretta: profile_id → profiles.user_id
-- ============================================================
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deadlines_select" ON deadlines;
DROP POLICY IF EXISTS "deadlines_insert" ON deadlines;
DROP POLICY IF EXISTS "deadlines_update" ON deadlines;
DROP POLICY IF EXISTS "deadlines_delete" ON deadlines;

CREATE POLICY "deadlines_select" ON deadlines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "deadlines_insert" ON deadlines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "deadlines_update" ON deadlines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "deadlines_delete" ON deadlines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

-- ============================================================
-- ACCOUNTANT
-- Ownership indiretta: profile_id → profiles.user_id
-- ============================================================
ALTER TABLE accountant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accountant_select" ON accountant;
DROP POLICY IF EXISTS "accountant_insert" ON accountant;
DROP POLICY IF EXISTS "accountant_update" ON accountant;
DROP POLICY IF EXISTS "accountant_delete" ON accountant;

CREATE POLICY "accountant_select" ON accountant
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "accountant_insert" ON accountant
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "accountant_update" ON accountant
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "accountant_delete" ON accountant
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );
