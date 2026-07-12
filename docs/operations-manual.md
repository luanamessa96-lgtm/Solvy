# Solvy — Operations Manual

*Questo documento copre la gestione quotidiana di Solvy dopo il deploy iniziale: cosa monitorare, cosa fare quando qualcosa si rompe, cosa serve per un backup completo. È leggibile da solo. Per il setup iniziale vedi `deployment-guide.md`; per la postura di sicurezza vedi `security-overview.md`; per i gap di prodotto noti vedi `known-limitations.md`.*

## Monitoraggio esistente

- **Sentry** — tracciamento errori runtime in produzione (dettaglio in `security-overview.md`)
- **Alert Telegram interni** — notifiche automatiche su eventi rilevanti (nuovo utente, nuovo abbonamento Pro), inviate a un bot collegato oggi all'account della fondatrice. Non è funzionalità di prodotto e non è indispensabile per il funzionamento di Solvy — va semplicemente ricollegato a un nuovo bot/destinatario dopo il trasferimento (vedi `credential-transfer-plan.md`)

Non esiste oggi un dashboard di monitoraggio centralizzato oltre a questi due canali.

## Problema operativo noto: redeploy di `stripe-webhook`

**Sintomo**: un utente completa il pagamento su Stripe ma il suo account non risulta aggiornato a Pro nell'app.

**Causa**: Supabase reimposta il controllo JWT di default su una Edge Function ogni volta che viene ridistribuita, a meno che il deploy non specifichi esplicitamente di disattivarlo. Quando questo accade su `stripe-webhook`, Supabase respinge con 401 tutte le richieste in arrivo da Stripe prima ancora che il codice della funzione venga eseguito — gli eventi di pagamento non vengono mai elaborati.

**Soluzione**: ogni deploy di questa funzione deve usare `supabase functions deploy stripe-webhook --no-verify-jwt`. Se il problema si è già verificato, gli eventi falliti possono essere reinviati manualmente dal dashboard Stripe (Developers → Webhooks → Eventi → Resend) una volta corretto il deploy.

**Perché è documentato qui in dettaglio**: si è già verificato due volte in produzione. È il singolo problema operativo più probabile che un nuovo team incontrerà.

## Manutenzione periodica

- **Dipendenze**: eseguire `npm audit` periodicamente (non solo una tantum) e valutare i fix disponibili — l'ultima verifica formale ha risolto 4 vulnerabilità su 5 (dettaglio in `security-overview.md`)
- **Migration**: ogni nuova migration deve seguire il formato timestamp standard di Supabase e passare da `supabase db push`, mai da esecuzione manuale nell'SQL Editor — motivo spiegato in `supabase/migrations/README.md`

## Troubleshooting rapido

| Sintomo | Causa probabile | Dove guardare |
|---|---|---|
| Pagamento completato ma account non aggiornato a Pro | `verify_jwt` reintrodotto su `stripe-webhook` dopo un redeploy | Vedi sezione dedicata sopra |
| Email transazionali (benvenuto, upgrade) non arrivano | `LOOPS_API_KEY` mancante/scaduta, o problema lato Loops | `supabase/functions/README.md` (funzione `loops-sync`), dashboard Loops |
| Fattura elettronica IT bloccata su "in attesa" o esito inatteso | L'account A-Cube in uso è ancora in modalità sandbox — nessuna fattura raggiunge realmente il Sistema di Interscambio | `known-limitations.md` |
| Nessun alert Telegram ricevuto | Bot/chat ID non ricollegati dopo il trasferimento | `credential-transfer-plan.md` |

## Backup & Restore

Cosa serve per un ripristino completo, in caso di perdita o migrazione dell'infrastruttura:

- **Database** — lo schema è sempre ricostruibile da `supabase/schema_production.sql`. I **dati reali** sono coperti da un backup automatico giornaliero: `.github/workflows/db-backup.yml` esegue ogni notte un dump completo (ruoli, schema, dati) tramite Supabase CLI, lo cifra con AES-256 e lo conserva come artifact GitHub per 90 giorni. È una soluzione ponte a costo zero per il piano Free (che non include backup automatici) — se il progetto viene aggiornato a Supabase Pro, i backup automatici del piano sostituiscono questo meccanismo, che può restare comunque attivo come ridondanza aggiuntiva

**Ripristino da backup**:
1. Scaricare l'artifact più recente da GitHub Actions → workflow "Database Backup"
2. Decifrare: `openssl enc -d -aes-256-cbc -pbkdf2 -salt -in backup-YYYYMMDD.tar.gz.enc -out backup.tar.gz -pass pass:"<passphrase>"` (la passphrase è salvata nel password manager, non nel repository)
3. Estrarre: `tar -xzf backup.tar.gz`
4. Ripristinare in ordine su un database di destinazione: `psql "$DB_URL" -f roles.sql`, poi `-f schema.sql`, poi `-f data.sql`

**Limiti dichiarati**: nessun point-in-time recovery, nessun test di ripristino automatizzato — la procedura è documentata ma va verificata manualmente al bisogno. Granularità giornaliera, non infra-giornaliera.
- **Storage** — il bucket `uploads` (PDF e immagini) non è coperto da `schema_production.sql`: richiede un export separato dei file tramite dashboard o API Supabase Storage
- **Variabili d'ambiente e secret** — l'elenco completo di cosa preservare è in `environment-variables-guide.md`; vanno conservati in modo sicuro (gestore di password/secret) prima di qualsiasi passaggio di proprietà degli account
- **Repository Git** — GitHub costituisce di per sé una copia distribuita della cronologia; in caso di trasferimento della proprietà del repository, vale comunque la pena mantenerne un clone locale indipendente fino a trasferimento confermato (vedi `credential-transfer-plan.md`)
