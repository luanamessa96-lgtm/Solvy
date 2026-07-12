# Cronologia delle migration — note per chi prende in mano il progetto

## Riferimento autoritativo

**Per ricreare lo schema da zero su un nuovo progetto Supabase, usa `supabase/schema_production.sql`.** È un dump autentico (`pg_dump --schema-only`) generato il 2026-07-12 direttamente dal database di produzione — non una ricostruzione manuale. Esegui quel file per intero; non serve rigiocare le migration qui sotto in ordine.

Questa cartella resta come registro storico delle modifiche, ma **non è affidabile per una replay cronologica esatta** — il motivo è spiegato sotto, per trasparenza verso chi fa due diligence tecnica sul progetto.

## Perché i file locali non corrispondono al registro di Supabase

16 migration in totale:

- **2 file in formato standard Supabase** (`20260325120000_enable_rls.sql`, `20260325130000_profiles_realtime.sql`) — applicate via CLI, correttamente tracciate sia in locale che sul registro remoto (`supabase_migrations.schema_migrations`).
- **14 file in formato legacy `T8`...`T38`** — il nome non rispetta il pattern richiesto da Supabase (`<timestamp>_nome.sql`), quindi **la CLI le ignora completamente** (`supabase migration list --linked` le marca come "Skipping"). Il registro remoto ha invece 14 timestamp reali (dal 2026-04-02 al 2026-04-28) senza alcun file locale corrispondente per nome.

La causa: alcuni di questi file (`T8`, `T9`, `T11`, per commento esplicito nel codice) furono scritti per essere incollati a mano nell'SQL Editor di Supabase, non applicati via CLI. Il contenuto SQL è verificato presente e funzionante nel database live (confermato dal dump del 2026-07-12: i campi di `T37_territory.sql` e `T38_sdi_fields.sql` risultano correttamente applicati), ma la CLI non ha un modo di collegare questi file al timestamp con cui Supabase li ha registrati internamente.

**Correlazione trovata**: la data del primo commit git di `T37_territory.sql` (2026-04-28 17:28:54 UTC) coincide, al secondo, con l'ultimo timestamp del registro remoto (`20260428172836` = 17:28:36 UTC) — prova che almeno questa migration fu effettivamente applicata in quel momento. Non è stato possibile stabilire una mappatura 1:1 verificata per tutti gli altri 13 file con la stessa certezza: il registro remoto mostra solo l'evento di applicazione, non il contenuto, e le date dei file locali (commit git) precedono di giorni le date di applicazione remota — segno che i file furono scritti come promemoria prima di essere effettivamente eseguiti a mano.

**Duplicato individuato**: `T15_enable_rls.sql` e `20260325120000_enable_rls.sql` hanno lo stesso identico timestamp di primo commit (2026-03-25 14:05:22+01:00) e lo stesso contenuto logico (abilitazione RLS). Il secondo è la versione "ufficiale" poi tracciata da Supabase; il primo è un residuo. Se in futuro si rigioca manually la cartella `T*`, va saltato per evitare di eseguire due volte la stessa cosa (comunque innocuo, essendo idempotente, ma è una fonte di confusione da conoscere).

## Regola per il futuro

Ogni nuova migration **deve** passare da `supabase migration new <nome>` (o rispettare comunque il formato `<timestamp>_nome.sql`) ed essere applicata solo via `supabase db push` — mai incollata a mano nell'SQL Editor. Le ultime 2 migration del repository già rispettano questa regola; è la convenzione da mantenere.

## File aggiunti in questa fase (2026-07-12)

- `schema_production.sql` — rigenerato da dump autentico (sostituisce la versione dell'1 aprile, obsoleta e coprente solo 2 migration su 16)
- `20260712000000_grant_privileges.sql` — cattura i GRANT già presenti in produzione ma mai scritti in una migration locale (vedi commento nel file). **Non applicata al database di produzione** — è già a posto lì; serve solo per la riproducibilità futura su un nuovo progetto.
