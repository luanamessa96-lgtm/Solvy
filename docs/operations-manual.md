# Solvy — Operations Runbook

Procedure operative per la gestione di Solvy in produzione.

## Monitoring

- **Sentry** — tracciamento degli errori runtime in produzione (vedi `security-overview.md`).
- **Alert Telegram** — notifiche automatiche su eventi selezionati (nuovo utente, nuovo abbonamento Pro), inviate a un bot collegato all'account della fondatrice. Canale interno, non user-facing; da ricollegare a un nuovo bot/destinatario dopo il trasferimento (vedi `credential-transfer-plan.md`).

Non è presente un dashboard di monitoraggio centralizzato oltre a questi due canali.

## Operational Procedures

### Deploy di `stripe-webhook`

Ogni deploy della funzione `stripe-webhook` deve specificare il flag `--no-verify-jwt`:

```
supabase functions deploy stripe-webhook --no-verify-jwt
```

In assenza del flag, Supabase applica il controllo JWT di default e le richieste Stripe ricevono `401` prima dell'esecuzione della funzione; gli eventi di pagamento non vengono elaborati e l'account utente non passa a Pro.

Recupero degli eventi non elaborati: Stripe Dashboard → Developers → Webhooks → Events → Resend, dopo aver corretto il deploy.

## Routine Maintenance

- **Dipendenze** — eseguire `npm audit` periodicamente e valutare i fix disponibili (stato corrente in `security-overview.md`).
- **Migration** — ogni nuova migration segue il formato timestamp di Supabase e viene applicata con `supabase db push`, non tramite SQL Editor (vedi `supabase/migrations/README.md`).

## Troubleshooting

| Sintomo | Causa | Riferimento |
|---|---|---|
| Pagamento completato, account non aggiornato a Pro | `verify_jwt` reintrodotto su `stripe-webhook` dopo un redeploy | "Deploy di `stripe-webhook`" |
| Email transazionali (benvenuto, upgrade) non recapitate | `LOOPS_API_KEY` mancante o scaduta, o problema lato Loops | `supabase/functions/README.md` (`loops-sync`), dashboard Loops |
| Fattura elettronica IT bloccata su "in attesa" o esito inatteso | Account A-Cube in modalità sandbox | `known-limitations.md` |
| Alert Telegram non ricevuti | Bot/chat ID non ricollegati dopo il trasferimento | `credential-transfer-plan.md` |

## Backup & Restore

### Contenuto del backup

- **Schema del database** — ricostruibile da `supabase/schema_production.sql`.
- **Dati** — backup completo giornaliero (ruoli, schema, dati) eseguito da `.github/workflows/db-backup.yml`: dump via Supabase CLI, cifratura AES-256, conservazione come artifact GitHub per 90 giorni.
- **Non incluso nel backup del database** — bucket Storage `uploads` (PDF e immagini allegati a fatture/spese), da esportare separatamente tramite dashboard o Storage API di Supabase.

### Stato di verifica

Ripristino eseguito su un database isolato con esito conforme per ruoli, schema, dati e policy RLS.

### Procedura di ripristino

1. Scaricare l'artifact più recente da GitHub Actions → workflow "Database Backup".
2. Decifrare:
   ```
   openssl enc -d -aes-256-cbc -pbkdf2 -salt -in backup-YYYYMMDD.tar.gz.enc -out backup.tar.gz -pass pass:"<passphrase>"
   ```
   La passphrase è conservata nel password manager, non nel repository.
3. Estrarre:
   ```
   tar -xzf backup.tar.gz
   ```
4. Ripristinare in ordine sul database di destinazione:
   ```
   psql "$DB_URL" -f roles.sql
   psql "$DB_URL" -f schema.sql
   psql "$DB_URL" -f data.sql
   ```

### Limitazioni

- Nessun point-in-time recovery.
- Granularità giornaliera.
- Test di ripristino non automatizzato in CI.

### Piano Supabase Pro

In caso di upgrade a Supabase Pro, i backup automatici del piano sostituiscono il workflow; quest'ultimo può essere mantenuto come ridondanza.

## Operational Notes

- **Secret e variabili d'ambiente** — elenco completo in `environment-variables-guide.md`; da conservare in un gestore di secret prima di qualsiasi passaggio di proprietà degli account.
- **Repository** — in caso di trasferimento della proprietà del repository, mantenere un clone locale indipendente fino a conferma del trasferimento (vedi `credential-transfer-plan.md`).
