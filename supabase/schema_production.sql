-- ============================================================
-- SCHEMA PRODUCTION — dump autentico
-- Generato: 2026-07-12
-- Metodo: pg_dump --schema-only --schema public, connessione diretta
--         al progetto linkato (non da migration replay, non a mano)
-- Progetto: feotobojhzywgylqzkyu (North EU / Stockholm)
-- PostgreSQL 17.6.1 — Supabase
-- ============================================================
-- Questo file è la rappresentazione FEDELE dello stato attuale
-- del database di produzione. Per ricreare l'ambiente da zero su
-- un nuovo progetto Supabase, esegui questo file per intero —
-- non è necessario (né consigliato) rigiocare le migration in
-- supabase/migrations/ in ordine: vedi supabase/migrations/README.md
-- per il perché.
-- ============================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, job_type, avatar, country, currency)
  VALUES (NEW.id, NEW.id, '', '', 'Italy', 'EUR');
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."accountant" (
    "id" "text",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "office" "text" NOT NULL,
    "contract_details" "text" NOT NULL,
    "sending_instructions" "text" NOT NULL,
    "profile_id" "text"
);

ALTER TABLE "public"."accountant" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."deadlines" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "date" "date" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric,
    "profile_id" "text",
    "completed" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deadlines_type_check" CHECK (("type" = ANY (ARRAY['tax'::"text", 'payment'::"text", 'other'::"text"])))
);

ALTER TABLE "public"."deadlines" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "client" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text",
    "profile_id" "text",
    "image_data" "text",
    "file_name" "text",
    "invoice_number" "text",
    "client_address" "text",
    "client_piva" "text",
    "client_cf" "text",
    "ritenuta" boolean DEFAULT false,
    "marca_bollo" boolean DEFAULT false,
    "iva_rate" numeric DEFAULT 0,
    "rivalsa_inps" boolean DEFAULT false,
    "doc_regime" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "client_sdi" "text",
    "client_pec" "text",
    "validez_date" "text",
    "intracomunitaria" boolean DEFAULT false,
    "nif_proveedor" "text",
    "sdi_status" "text",
    "sdi_id" "text",
    "sdi_sent_at" timestamp with time zone,
    CONSTRAINT "documents_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'pending'::"text", 'overdue'::"text", 'draft'::"text"]))),
    CONSTRAINT "documents_type_check" CHECK (("type" = ANY (ARRAY['invoice'::"text", 'expense'::"text", 'credit_note'::"text", 'proforma'::"text", 'factura_rectificativa'::"text", 'presupuesto'::"text"])))
);

ALTER TABLE "public"."documents" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "country" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "job_type" "text" NOT NULL,
    "avatar" "text" NOT NULL,
    "address" "text",
    "piva" "text",
    "codice_fiscale" "text",
    "regime" "text",
    "coefficiente" numeric,
    "anno_inizio_attivita" integer,
    "iban" "text",
    "is_pro" boolean DEFAULT false,
    "user_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "theme" "text" DEFAULT 'light'::"text",
    "name" "text",
    "stripe_customer_id" "text",
    "email" "text",
    "nie" "text",
    "regimen_fiscal" "text",
    "iva_habitual" integer,
    "subscription_started_at" timestamp with time zone,
    "region" "text",
    "street" "text",
    "cap" "text",
    "city" "text",
    "province" "text",
    "reddito_n1" numeric,
    "invoice_counters" "jsonb" DEFAULT '{}'::"jsonb",
    "deleted_invoice_numbers" "jsonb" DEFAULT '[]'::"jsonb",
    "subscription_plan" "text",
    "has_ostativa_cause" boolean DEFAULT false,
    "mese_inizio_attivita" integer,
    "reta_mensile" numeric,
    "cuota_131_trimestral" numeric,
    "territory" "text" DEFAULT 'peninsula'::"text" NOT NULL,
    CONSTRAINT "profiles_mese_inizio_attivita_check" CHECK ((("mese_inizio_attivita" >= 1) AND ("mese_inizio_attivita" <= 12))),
    CONSTRAINT "profiles_subscription_plan_check" CHECK (("subscription_plan" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "profiles_territory_check" CHECK (("territory" = ANY (ARRAY['peninsula'::"text", 'canarias'::"text"])))
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;

ALTER TABLE "public"."profiles" OWNER TO "postgres";

COMMENT ON COLUMN "public"."profiles"."territory" IS 'Territorio fiscale ES: peninsula (IVA standard) | canarias (IGIC)';

ALTER TABLE ONLY "public"."accountant"
    ADD CONSTRAINT "accountant_profile_id_key" UNIQUE ("profile_id");

ALTER TABLE ONLY "public"."deadlines"
    ADD CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_profiles_stripe_customer_id" ON "public"."profiles" USING "btree" ("stripe_customer_id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."accountant" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountant_delete" ON "public"."accountant" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "accountant"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "accountant_insert" ON "public"."accountant" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "accountant"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "accountant_select" ON "public"."accountant" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "accountant"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "accountant_update" ON "public"."accountant" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "accountant"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

ALTER TABLE "public"."deadlines" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deadlines_delete" ON "public"."deadlines" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "deadlines"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "deadlines_insert" ON "public"."deadlines" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "deadlines"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "deadlines_select" ON "public"."deadlines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "deadlines"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "deadlines_update" ON "public"."deadlines" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "deadlines"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_delete" ON "public"."documents" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "documents"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "documents_insert" ON "public"."documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "documents"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "documents_select" ON "public"."documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "documents"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

CREATE POLICY "documents_update" ON "public"."documents" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE ((("profiles"."id")::"text" = "documents"."profile_id") AND ("profiles"."user_id" = "auth"."uid"())))));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_delete" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "users_delete_own" ON "public"."profiles" FOR DELETE USING (("user_id" = "auth"."uid"()));

CREATE POLICY "users_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "users_select_own" ON "public"."profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));

CREATE POLICY "users_update_own" ON "public"."profiles" FOR UPDATE USING (("user_id" = "auth"."uid"()));

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."deadlines";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."documents";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON TABLE "public"."accountant" TO "anon";
GRANT ALL ON TABLE "public"."accountant" TO "authenticated";
GRANT ALL ON TABLE "public"."accountant" TO "service_role";

GRANT ALL ON TABLE "public"."deadlines" TO "anon";
GRANT ALL ON TABLE "public"."deadlines" TO "authenticated";
GRANT ALL ON TABLE "public"."deadlines" TO "service_role";

GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- ============================================================
-- NOTA — GRANT ALL a "anon"
-- Non è un errore di configurazione: è il pattern standard
-- Supabase. L'accesso reale ai dati è interamente filtrato dalle
-- RLS policy sopra (verificate: tutte le tabelle hanno RLS
-- abilitata, tutte le policy sono scoped su auth.uid() = user_id
-- o su un JOIN verso profiles.user_id — nessuna policy permissiva
-- USING (true) trovata in produzione).
-- ============================================================

-- ============================================================
-- STORAGE BUCKET (schema "storage", non incluso nel dump
-- --schema public sopra — documentato manualmente)
-- ============================================================
-- Bucket: uploads (public)
-- Usato per PDF e immagini — URL pubblici
-- https://feotobojhzywgylqzkyu.supabase.co/storage/v1/object/public/uploads/...
-- Da ricreare su un nuovo progetto via:
--   Dashboard → Storage → New bucket → nome: "uploads" → Public: ON
