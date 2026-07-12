-- Idempotenza webhook Stripe: Stripe garantisce consegna "almeno una volta",
-- non "esattamente una volta" — lo stesso evento può arrivare più volte per
-- retry di rete o timeout. Questa tabella registra gli event.id già gestiti;
-- stripe-webhook tenta un insert prima di elaborare, e se fallisce per
-- violazione di chiave primaria significa che l'evento è un duplicato.
--
-- Accesso: solo service_role (bypassa RLS). Nessuna policy per
-- anon/authenticated — nessun utente deve mai leggere o scrivere qui.

CREATE TABLE IF NOT EXISTS "public"."stripe_processed_events" (
    "event_id" text PRIMARY KEY,
    "processed_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."stripe_processed_events" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."stripe_processed_events" TO "service_role";
