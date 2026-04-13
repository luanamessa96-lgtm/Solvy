---
name: sicurezza
description: Regole sicurezza Solvy: RLS, CSP, variabili ambiente, edge functions, autenticazione. Usa quando modifichi query Supabase, edge functions, vercel.json, configurazioni auth o variabili d'ambiente.
user-invocable: false
---

# Regole Sicurezza Solvy

## Variabili d'ambiente

**Non modificare mai direttamente** le variabili d'ambiente di produzione.
- Variabili Vercel: modificabili solo dalla dashboard Vercel
- Secrets Supabase: modificabili solo dalla dashboard Supabase
- Mai committare `.env` o valori reali nel codice

Ambienti separati:
- Preview/Dev: Supabase `pblonvbqhcetuqiogbcb`
- Production: Supabase `feotobojhzywgylqzkyu`

## RLS (Row Level Security)

RLS è attivo su tutte le tabelle — non disabilitarlo mai.

Ogni query deve rispettare le policy esistenti. Se una query fallisce per RLS, la soluzione è aggiustare la policy, non bypassare RLS.

Pattern standard policy:
```sql
USING (auth.uid() = user_id)
```

## Edge Functions

Le edge functions girano su Supabase. Non inserire logica di business sensibile lato client.

Edge functions esistenti (non rinominare):
- `send-email` — Resend, template branded
- `stripe-webhook` — gestione pagamenti
- `delete-account` — GDPR
- `telegram-alert` — notifiche @Solvy_Alerts_Bot
- `loops-sync` — sincronizzazione Loops.so

## CSP (Content Security Policy)

Configurata in `vercel.json`. Non allargare le direttive CSP senza valutare l'impatto.
Header presenti: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.

## Autenticazione

- Rate limiting login: 5 tentativi → blocco 15 min (implementato lato client + Supabase)
- JWT expiry: 3600s (default Supabase) — non modificare
- Non esporre mai il service role key lato client

## Storage

File caricati su bucket Supabase `uploads`. Usare sempre URL `https://` pubblici — mai `blob://` (iOS Safari li blocca).
La funzione `uploadFile()` in `src/lib/db.ts` gestisce upload correttamente — usarla sempre.
