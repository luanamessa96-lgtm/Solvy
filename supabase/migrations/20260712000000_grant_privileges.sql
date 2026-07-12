-- Allineamento sorgente: GRANT già presenti in produzione, mai catturati
-- in una migration locale.
--
-- CONTESTO: questo file NON corregge un problema di produzione — i GRANT
-- qui elencati sono già attivi sul database live (verificato tramite dump
-- autentico del 2026-07-12, vedi supabase/schema_production.sql). Sono
-- stati creati automaticamente da Supabase quando le tabelle furono
-- generate, ma non risultavano in nessun file di migration versionato.
--
-- SCOPO: rendere il repository riproducibile. Senza questo file, chi
-- ricrea lo schema da zero su un nuovo progetto Supabase eseguendo solo
-- le migration in questa cartella otterrebbe tabelle senza alcun
-- privilegio concesso a anon/authenticated/service_role — inaccessibili
-- dal client fin dal primo avvio.
--
-- Tutte le istruzioni sono idempotenti (GRANT e ALTER DEFAULT PRIVILEGES
-- non falliscono se il privilegio esiste già), quindi questo file è
-- sicuro da applicare anche in futuro — ma non è stato eseguito contro
-- il database di produzione in questa fase, per esplicita richiesta.
--
-- Nota di sicurezza: GRANT ALL a "anon" è il pattern standard di
-- Supabase, non un errore. L'accesso reale è filtrato dalle RLS policy
-- (verificate restrittive su tutte le tabelle — vedi documentazione
-- di sicurezza del prodotto).

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

-- Privilegi di default per QUALSIASI tabella futura creata in "public" —
-- copre anche il caso di nuove tabelle aggiunte da migration successive
-- a questa, senza bisogno di ripetere i GRANT ogni volta.
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
