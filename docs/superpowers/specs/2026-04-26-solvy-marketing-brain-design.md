# Solvy Marketing Brain — Spec di Sistema

**Data:** 26 aprile 2026  
**Autore:** Luana Messa  
**Stack:** TypeScript · Vercel · Supabase · Claude API · Telegram  

---

## 1. Obiettivo

Costruire un sistema di agenti AI autonomi che eseguono le attività di marketing di Solvy in modo automatico e schedulato, consegnando output pronti all'uso su Telegram. Il progetto serve anche come percorso di apprendimento pratico per la certificazione Anthropic.

---

## 2. Gli Agenti

| Agente | Frequenza | Output | Concetto API imparato |
|---|---|---|---|
| Content Agent | Ogni lunedì | 5 post IT + 5 post ES (LinkedIn, Reddit, TikTok) | Chiamate base + Prompt caching |
| Community Scout | Ogni mercoledì | Report community: link a conversazioni reali, cosa rispondere | Tool use (web search via Tavily) |
| Outreach Agent | Ogni venerdì | 3 email personalizzate per commercialisti/giornalisti | Structured output (JSON) |
| SEO Blog Agent | Primo del mese | Articolo 1.500 parole su keyword fiscale (IT o ES) | Long-form generation |
| Weekly Recap | Ogni domenica | Riepilogo settimana: cosa pubblicare, inviare, monitorare | Multi-agent orchestration |
| Launch Prep Agent | Una volta sola | Tutto il materiale Product Hunt (tagline, desc, FAQ, primo commento) | Script one-shot manuale |

---

## 3. Architettura

```
marketing-brain/
├── agents/
│   ├── content-agent.ts
│   ├── community-scout.ts
│   ├── outreach-agent.ts
│   ├── seo-blog-agent.ts
│   ├── weekly-recap.ts
│   └── launch-prep.ts
├── lib/
│   ├── anthropic.ts          # Client Claude API con prompt caching
│   ├── telegram.ts           # Invio messaggi (testo + split lunghi)
│   ├── tavily.ts             # Web search per Community Scout
│   ├── supabase.ts           # Client Supabase
│   └── solvy-context.ts      # ⭐ Positioning, tono, headline, parole vietate
├── api/cron/
│   ├── monday.ts             # → Content Agent
│   ├── wednesday.ts          # → Community Scout
│   ├── friday.ts             # → Outreach Agent
│   ├── sunday.ts             # → Weekly Recap
│   └── monthly.ts            # → SEO Blog Agent
└── vercel.json               # Configurazione cron jobs
```

---

## 4. Flusso di Ogni Agente

```
Vercel Cron → API Route → Carica contesto Solvy (in cache) 
→ Chiama Claude API → Elabora output 
→ Salva su Supabase → Manda su Telegram
→ Se errore → Notifica Telegram
```

Il Launch Prep Agent si lancia manualmente:
```bash
npx tsx agents/launch-prep.ts
```

---

## 5. Il File Più Importante: `solvy-context.ts`

Contiene tutto il contesto di Solvy in cache. Se questo file è sbagliato, tutti gli agenti producono contenuto sbagliato.

Deve includere:
- Posizionamento core: "Il freelancer non vuole gestire le tasse. Vuole non pensarci più."
- Job reali per mercato (IT: chiarezza · ES: sollievo trimestrale)
- Tono per mercato (IT: rassicurante · ES: ritmo e sollievo)
- Parole vietate: "semplice", "facile"
- Headline testate (IT + ES)
- Fasi della roadmap marketing attiva
- Competitor da non citare direttamente

---

## 6. Database Supabase

### Tabella: `agent_outputs`
| Campo | Tipo | Note |
|---|---|---|
| id | uuid | Primary key |
| agent | text | es. "content-agent" |
| week | date | Lunedì della settimana di riferimento |
| lang | text | "it" o "es" |
| output | jsonb | Contenuto generato |
| created_at | timestamp | Auto |

### Tabella: `contacts`
| Campo | Tipo | Note |
|---|---|---|
| id | uuid | Primary key |
| name | text | Nome contatto |
| type | text | "commercialista", "giornalista", "community" |
| email | text | |
| lang | text | "it" o "es" |
| last_contacted_at | timestamp | Aggiornato dall'Outreach Agent |
| notes | text | Contesto personalizzazione |

---

## 7. Variabili d'Ambiente

Da aggiungere su Vercel (Settings → Environment Variables):

| Variabile | Dove si prende |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → /newbot |
| `TELEGRAM_CHAT_ID` | Telegram → @userinfobot (il tuo ID personale) |
| `TAVILY_API_KEY` | app.tavily.com → free tier |
| `SUPABASE_URL` | Già su Vercel per Solvy |
| `SUPABASE_SERVICE_ROLE_KEY` | Già su Vercel per Solvy |

---

## 8. Gestione Errori

Ogni agente è avvolto in un try/catch globale. In caso di errore:

```
→ Log su Vercel
→ Messaggio Telegram: "⚠️ [nome-agente] fallito — [messaggio errore]"
```

---

## 9. Limiti da Tenere a Mente

| Servizio | Limite | Note |
|---|---|---|
| Vercel cron (Pro) | 40 cron jobs, timeout 5 min | Più che sufficiente |
| Tavily free | 1.000 ricerche/mese | Community Scout usa ~10/settimana = ~520/anno ✓ |
| Telegram | 4.096 caratteri/messaggio | Articoli SEO → salvati su Supabase, link su Telegram |
| Costo Claude API | ~€1/mese | ~70K token totali/mese su Sonnet |

---

## 10. Ordine di Costruzione (Percorso di Apprendimento)

Costruire in questo ordine segue il curriculum Anthropic Academy:

1. **Setup base** — API key, Telegram bot, client Anthropic con prompt caching
2. **Content Agent** — prima chiamata API, struttura base, prompt caching
3. **Outreach Agent** — structured output con JSON
4. **Community Scout** — tool use con Tavily
5. **SEO Blog Agent** — long-form generation
6. **Weekly Recap** — orchestrazione multi-agente
7. **Launch Prep Agent** — script one-shot
8. **Cron jobs Vercel** — deploy e scheduling

---

## 11. Prerequisiti (Prima di Scrivere Codice)

- [ ] Creare account su console.anthropic.com e aggiungere carta di credito
- [ ] Creare bot Telegram via @BotFather → ottenere token
- [ ] Ottenere il proprio Telegram Chat ID via @userinfobot
- [ ] Creare account su app.tavily.com → ottenere API key gratuita
- [ ] Creare tabelle Supabase (`agent_outputs`, `contacts`)

---

*Spec approvata il 26 aprile 2026*
