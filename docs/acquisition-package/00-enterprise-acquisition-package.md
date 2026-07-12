# Solvy — Enterprise Acquisition Package

*Struttura definitiva del pacchetto di acquisizione. Ogni cartella corrisponde a una categoria che un CTO, un M&A Advisor o un CEO acquirente si aspetta di trovare separata durante una due diligence. I documenti citati esistono già nel repository — questo file è la mappa che li organizza, non li duplica.*

## 00 — Executive

Il punto di ingresso. Chi ha 10 minuti legge solo questa cartella.

- `docs/acquisition-package/executive-summary.md` — sintesi dell'intero pacchetto
- `docs/executive-overview.md` — cos'è Solvy, posizionamento, cosa è incluso nella vendita
- `docs/acquisition-package/buyer-journey.md` — percorso di valutazione consigliato

## 01 — Legal

- `docs/ip-ownership-licensing.md` — proprietà del codice, del dominio, del brand; audit licenze open source
- `LICENSE` — licenza formale del software
- `SECURITY.md` — canale di segnalazione vulnerabilità
- `public/privacy.html`, `public/terms.html`, `public/cookies.html` — verificati accurati e coerenti con l'implementazione reale

## 02 — Technology

- `docs/architecture-overview.md` — architettura di sistema, pattern modulo-paese
- `docs/repository-structure.md` — mappa di navigazione del codice
- `docs/security-overview.md` — postura di sicurezza verificata
- `supabase/schema_production.sql` — schema database autentico
- `supabase/functions/README.md` — le 12 Edge Function documentate
- `supabase/migrations/README.md` — cronologia database, incluse le incertezze dichiarate onestamente
- `.github/workflows/ci.yml`, `.github/dependabot.yml` — pipeline di verifica automatica

## 03 — Documentation

- `docs/data-room-index.md` — indice della Data Room tecnica completa (14 documenti)
- `docs/feature-guide.md` — funzionalità verificate, confine Free/Pro
- `docs/faq-acquirente.md` — risposte trasversali già pronte

## 04 — Operations

- `docs/deployment-guide.md`, `docs/installation-guide.md`
- `docs/operations-manual.md` — monitoraggio, problema noto documentato, backup/restore
- `docs/environment-variables-guide.md`
- `docs/acquisition-package/enterprise-gap-analysis.md` — cosa resta da chiudere prima di operare in autonomia

## 05 — AI

- `CLAUDE.md` — regole fiscali come fonte di verità
- `.claude/skills/fiscale-avanzata/`, `fiscale-es/`, `fiscale-it/`, `i18n/`, `sicurezza/`, `ui-solvy/`, `site-architecture/`, `web-asset-generator/` — le 8 skill di dominio
- `docs/acquisition-package/buyer-value-analysis.md` — sezione dedicata al valore di questo asset, oggi il meno visibile del pacchetto

## 06 — Design

- `src/styles/themes.css` — design system in-app
- `public/logo.png`, `public/*.svg`, icone PWA
- `docs/assets/` — screenshot professionali

## 07 — Marketing

- `public/landing.html` — landing page
- `public/llms.txt`, `public/sitemap.xml`, `public/robots.txt`, `public/pricing.md` — SEO tecnico
- Accesso Google Analytics 4 (`G-2F4JDKGKNX`) e Google Search Console — **esterni al repository**, da trasferire separatamente
- `src/views/GuidaFiscaleView.tsx`, `GuiaFiscalESView.tsx` — contenuto editoriale in-app

## 08 — Business

- `docs/credential-transfer-plan.md` — 8 servizi terzi, metodo di trasferimento
- `docs/known-limitations.md` — disclosure onesta dei gap di prodotto
- Dominio `solvyapp.com` — esterno al repository

## 09 — Transfer

- `docs/acquisition-package/enterprise-deliverables.md` — elenco definitivo di tutto ciò che viene consegnato
- Checklist di closing (già condivisa, da eseguire operativamente il giorno del trasferimento)

---

**Nota sulla struttura fisica**: questa mappa organizza concettualmente documenti che oggi vivono in una struttura piatta dentro `docs/`, già cross-referenziata e verificata. Non ho spostato fisicamente i file esistenti in sottocartelle per non rompere i collegamenti relativi già validati — se vuoi la riorganizzazione fisica in cartelle reali, è un'azione separata, a basso rischio ma da confermare esplicitamente prima di eseguirla.
