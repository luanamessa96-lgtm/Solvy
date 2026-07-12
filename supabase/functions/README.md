# Edge Functions — Riferimento

12 Supabase Edge Function (Deno), tutte esposte come endpoint HTTP. Nessuna logica di pagamento o invio email gira lato client — il frontend chiama sempre queste funzioni, mai Stripe/Loops/Telegram/A-Cube direttamente (regola architetturale, vedi `CLAUDE.md` del progetto).

| Funzione | Scopo | Chiamata da | Tabelle toccate | Secret richiesti |
|---|---|---|---|---|
| `create-checkout-session` | Crea una sessione Stripe Checkout per l'upgrade a Pro | Frontend (click "Passa a Pro") | `profiles` | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `create-customer-portal-session` | Genera il link al portale clienti Stripe (gestione autonoma abbonamento) | Frontend (sezione account) | `profiles` | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `cancel-subscription` | Cancella l'abbonamento Stripe immediatamente | Frontend | `profiles` | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `cancel-subscription-end-period` | Cancella l'abbonamento Stripe a fine periodo corrente (non immediato) | Frontend | `profiles` | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `stripe-webhook` | Riceve gli eventi Stripe (upgrade, cancellazione, rinnovo), aggiorna `profiles.is_pro`/`subscription_*`. **Verifica la firma della richiesta** (`constructEvent`) | Stripe (webhook esterno) | `profiles` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-account` | Cancellazione account completa: rimuove `documents`, `deadlines`, `accountant`, `profiles` e l'utente Auth; gestisce anche la cancellazione lato Stripe | Frontend (sezione account, azione distruttiva con conferma) | `accountant`, `deadlines`, `documents`, `profiles` | `STRIPE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `sdi-send` | Invia una fattura elettronica IT al Sistema di Interscambio tramite A-Cube | Frontend (invio/reinvio fattura IT) | `documents`, `profiles` | `ACUBE_EMAIL`, `ACUBE_PASSWORD`, `ACUBE_SANDBOX`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `sdi-webhook` | Riceve lo stato di consegna/scarto da A-Cube, aggiorna `documents.sdi_status`, notifica su Telegram | A-Cube (webhook esterno) | `documents` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| `send-email` | Invia l'email di benvenuto al signup (wrapper minimo — il resto del flusso email è gestito da Loops) | Frontend (post-registrazione) | — | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `loops-sync` | Sincronizza contatti/eventi utente con Loops (email transazionali: signup, upgrade, cancellazione) | Frontend + altre edge function | — | `LOOPS_API_KEY` |
| `telegram-alert` | Invia notifiche interne al bot Telegram di monitoraggio (nuovo utente, nuovo Pro) | Altre edge function (`stripe-webhook`, `send-email`) | — | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| `telegram-webhook` | Riceve i comandi/callback dal bot Telegram | Telegram (webhook esterno) | — | `TELEGRAM_BOT_TOKEN` |

## Note operative per chi prende in mano il progetto

- **Nessuna funzione tranne `stripe-webhook` verifica una firma crittografica della richiesta** — le altre si affidano all'autenticazione Supabase (JWT utente) o, per i webhook esterni (`sdi-webhook`, `telegram-webhook`), all'URL stesso come segreto implicito. Va tenuto presente in una eventuale revisione di sicurezza più approfondita.
- **Bug ricorrente noto**: ogni redeploy di `stripe-webhook` deve includere il flag `--no-verify-jwt` (`supabase functions deploy stripe-webhook --no-verify-jwt`), altrimenti Supabase reintroduce il controllo JWT di default e Stripe riceve 401 su ogni evento. Successo già verificato 2 volte in produzione.
- `loops-sync` e `telegram-alert` sono funzioni di supporto, richiamate internamente da altre funzioni oltre che dal frontend — non hanno tabelle proprie perché operano solo su servizi esterni.
