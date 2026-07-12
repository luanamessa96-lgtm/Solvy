<div align="center">

<img src="./docs/assets/logo.png" alt="Solvy" width="120" />

# Solvy

**Gestione fiscale per freelancer. Senza ansia, senza Excel, senza sorprese.**

Solvy è una PWA mobile-first che calcola in tempo reale quanto devi al fisco, gestisce fatture e spese e ti ricorda le scadenze — per freelancer italiani (forfettario e ordinario) e autónomos spagnoli (estimación directa, incluse le Canarie).

[![Live](https://img.shields.io/badge/live-solvyapp.com-4CD9D0?style=flat-square)](https://solvyapp.com)
[![License](https://img.shields.io/badge/license-proprietary-C060A0?style=flat-square)]()
[![Tests](https://img.shields.io/badge/tests-161%20passing-success?style=flat-square)]()
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square)]()

[Website](https://solvyapp.com) · [Report a bug](https://github.com/luanamessa96-lgtm/Solvy/issues) · [Request a feature](https://github.com/luanamessa96-lgtm/Solvy/issues)

</div>

---

## Data Room

Solvy è un asset software pronto per essere acquisito. Se stai valutando il progetto — come acquirente, CTO o investitore — non serve leggere il codice per capirlo: comincia da qui.

| Vuoi... | Vai a... |
|---|---|
| Capire cos'è Solvy in 10 minuti | [`docs/executive-overview.md`](./docs/executive-overview.md) |
| Vedere l'indice completo della Data Room | [`docs/data-room-index.md`](./docs/data-room-index.md) |
| Capire l'architettura | [`docs/architecture-overview.md`](./docs/architecture-overview.md) |
| Vedere tutte le funzionalità | [`docs/feature-guide.md`](./docs/feature-guide.md) |
| Valutare la sicurezza | [`docs/security-overview.md`](./docs/security-overview.md) |

## Cos'è Solvy

Un libero professionista in regime forfettario (IT) o come autónomo (ES) deve calcolare a mano — o pagando un commercialista/gestor per ogni verifica — quanto accantonare per imposte e contributi, quando scadono i pagamenti, e come tenere traccia di fatture e spese. Solvy automatizza questi calcoli e li rende visibili in tempo reale, senza sostituirsi alla consulenza professionale. Live in produzione su [solvyapp.com](https://solvyapp.com).

## Tech stack

| Layer | Stack |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **Backend** | Supabase (Postgres + RLS, Auth, Realtime, Storage, Edge Functions) |
| **Pagamenti** | Stripe |
| **Fatturazione elettronica (IT)** | A-Cube (Sistema di Interscambio) |
| **Email** | Loops |
| **Hosting** | Vercel |
| **Monitoraggio** | Sentry |
| **Testing** | Vitest (161 test) + Playwright (9 suite e2e) |
| **i18n** | Italiano e spagnolo, ~280 chiavi |

Dettaglio completo in [`docs/architecture-overview.md`](./docs/architecture-overview.md).

## Funzionalità

Calcoli fiscali automatici IT/ES, gestione multi-profilo, fatture e spese con export PDF, fatturazione elettronica SdI, calendario scadenze, piani Free e Pro. Elenco completo e verificato, incluso il confine esatto tra Free e Pro, in [`docs/feature-guide.md`](./docs/feature-guide.md).

## Installazione

```bash
git clone https://github.com/luanamessa96-lgtm/Solvy.git
cd Solvy
npm install
cp .env.example .env
npm run dev
```

Guida completa, incluse le variabili d'ambiente necessarie, in [`docs/installation-guide.md`](./docs/installation-guide.md).

## Deploy

Sequenza completa per portare Solvy online da zero (database, Edge Function, Stripe, hosting) in [`docs/deployment-guide.md`](./docs/deployment-guide.md).

## Sicurezza

Row Level Security verificata e restrittiva su tutte le tabelle, nessun secret nel codice sorgente, header di sicurezza HTTP attivi. Postura completa, inclusi i punti ancora da migliorare, in [`docs/security-overview.md`](./docs/security-overview.md).

## Licenza

Software proprietario © 2026 Luana Messa. Tutti i diritti riservati. Il codice è pubblicato per trasparenza; non è concessa licenza d'uso, modifica o redistribuzione.
