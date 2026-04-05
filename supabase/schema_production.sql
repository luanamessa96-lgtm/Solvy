-- ============================================================
-- SCHEMA PRODUCTION - Esportato il 2026-04-01
-- Progetto: feotobojhzywgylqzkyu (eu-north-1)
-- PostgreSQL 17.6.1 — Supabase
-- ============================================================

-- ============================================================
-- MIGRAZIONI APPLICATE
-- ============================================================
-- 20260325120000 enable_rls
-- 20260325130000 profiles_realtime


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABELLA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id                 UUID        REFERENCES auth.users(id),
  name                    TEXT,
  email                   TEXT,
  avatar                  TEXT        NOT NULL,
  country                 TEXT        NOT NULL,
  currency                TEXT        NOT NULL,
  job_type                TEXT        NOT NULL,
  address                 TEXT,
  piva                    TEXT,
  codice_fiscale          TEXT,
  nie                     TEXT,
  regime                  TEXT,
  regimen_fiscal          TEXT,
  coefficiente            NUMERIC,
  anno_inizio_attivita    INTEGER,
  iva_habitual            INTEGER,
  iban                    TEXT,
  is_pro                  BOOLEAN     DEFAULT false,
  theme                   TEXT        DEFAULT 'light',
  stripe_customer_id      TEXT,
  subscription_started_at TIMESTAMPTZ,

  PRIMARY KEY (id)
);

-- Indici profiles
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles USING btree (stripe_customer_id);

-- RLS profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE TO public USING (auth.uid() = user_id);

-- Policy duplicate (users_*_own) — presenti in production, rispecchiate qui
CREATE POLICY users_select_own ON public.profiles
  FOR SELECT TO public USING (user_id = auth.uid());

CREATE POLICY users_insert_own ON public.profiles
  FOR INSERT TO public WITH CHECK (user_id = auth.uid());

CREATE POLICY users_update_own ON public.profiles
  FOR UPDATE TO public USING (user_id = auth.uid());

CREATE POLICY users_delete_own ON public.profiles
  FOR DELETE TO public USING (user_id = auth.uid());


-- ============================================================
-- TABELLA: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id              TEXT        NOT NULL,
  type            TEXT        NOT NULL CHECK (type = ANY (ARRAY['invoice', 'expense'])),
  title           TEXT        NOT NULL,
  amount          NUMERIC     NOT NULL,
  date            DATE        NOT NULL,
  status          TEXT        NOT NULL CHECK (status = ANY (ARRAY['paid', 'pending', 'overdue', 'draft'])),
  client          TEXT,
  category        TEXT,
  profile_id      TEXT,
  image_data      TEXT,
  file_name       TEXT,
  invoice_number  TEXT,
  client_address  TEXT,
  client_piva     TEXT,
  client_cf       TEXT,
  ritenuta        BOOLEAN     DEFAULT false,
  marca_bollo     BOOLEAN     DEFAULT false,
  iva_rate        NUMERIC     DEFAULT 0,
  rivalsa_inps    BOOLEAN     DEFAULT false,
  doc_regime      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (id)
);

-- RLS documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select ON public.documents
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY documents_insert ON public.documents
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY documents_update ON public.documents
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY documents_delete ON public.documents
  FOR DELETE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = documents.profile_id
        AND profiles.user_id = auth.uid()
    )
  );


-- ============================================================
-- TABELLA: deadlines
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deadlines (
  id          TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  date        DATE        NOT NULL,
  type        TEXT        NOT NULL CHECK (type = ANY (ARRAY['tax', 'payment', 'other'])),
  amount      NUMERIC,
  profile_id  TEXT,
  completed   BOOLEAN     DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (id)
);

-- RLS deadlines
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY deadlines_select ON public.deadlines
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY deadlines_insert ON public.deadlines
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY deadlines_update ON public.deadlines
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY deadlines_delete ON public.deadlines
  FOR DELETE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = deadlines.profile_id
        AND profiles.user_id = auth.uid()
    )
  );


-- ============================================================
-- TABELLA: accountant
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accountant (
  id                   TEXT,
  first_name           TEXT        NOT NULL,
  last_name            TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  phone                TEXT        NOT NULL,
  office               TEXT        NOT NULL,
  contract_details     TEXT        NOT NULL,
  sending_instructions TEXT        NOT NULL,
  profile_id           TEXT        UNIQUE
);

-- Indici accountant
CREATE UNIQUE INDEX IF NOT EXISTS accountant_profile_id_key
  ON public.accountant USING btree (profile_id);

-- RLS accountant
ALTER TABLE public.accountant ENABLE ROW LEVEL SECURITY;

CREATE POLICY accountant_select ON public.accountant
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY accountant_insert ON public.accountant
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY accountant_update ON public.accountant
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY accountant_delete ON public.accountant
  FOR DELETE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE (profiles.id)::text = accountant.profile_id
        AND profiles.user_id = auth.uid()
    )
  );


-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Bucket: uploads (public)
-- Usato per PDF e immagini — URL pubblici https://feotobojhzywgylqzkyu.supabase.co/storage/v1/object/public/uploads/...
-- Da ricreare manualmente nel progetto Dev:
--   Dashboard → Storage → New bucket → nome: "uploads" → Public: ON


-- ============================================================
-- REALTIME
-- ============================================================
-- La migrazione 20260325130000 (profiles_realtime) abilita
-- il realtime sulla tabella profiles.
-- Da riapplicare nel progetto Dev con: supabase db push
