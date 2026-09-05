---
name: fiscale-it
description: Regole logica fiscale italiana Solvy: forfettario e ordinario. Usa quando tocchi calcoli fiscali IT, aliquote, scadenze, contributi INPS, guida fiscale italiana.
user-invocable: false
---

# Logica Fiscale IT — Regole Solvy

## Regola fondamentale

**Non modificare mai la logica forfettario/ordinario senza istruzione esplicita.**

Questa logica è testata e validata. Cambiamenti non autorizzati possono causare calcoli fiscali errati per gli utenti.

## Regimi fiscali supportati

### Forfettario
- Aliquota sostitutiva: 15% (ordinaria) o 5% (primi 5 anni, nuove attività)
- Coefficiente di redditività: varia per codice ATECO
- Contributi INPS: fissi + variabili sul reddito eccedente minimale
- Nessuna IVA esposta in fattura
- Limite ricavi: €85.000/anno

### Ordinario
- IRPEF a scaglioni progressivi
- Deducibilità spese analitiche
- IVA trimestrale/annuale
- INPS gestione separata o artigiani/commercianti

## Scadenze fiscali IT

Le scadenze sono hardcodate in `src/views/CalendarView.tsx::getScadenzeFiscali()`. (Nota storica: fino al 2026-09-05 esisteva anche `it.ts::getItalianDeadlines()`, dead code mai collegato a nessuna UI con valori divergenti dal reale — rimossa insieme all'equivalente ES `getSpanishDeadlines()` e alla proprietà `getDeadlines` dell'interfaccia `CountryModule`, perché nessun punto del codice la richiamava, nemmeno tramite `getCountryModule()`.) Fonte di verità duplicata identica in `CLAUDE.md` §"Regole fiscali" — **nessuna fonte primaria esterna ha mai confermato queste date, sono state solo allineate al codice reale**: da verificare una per una con un professionista. Non modificare le date senza verifica normativa:

**Forfettario e ordinario (comuni):**
- 30 giugno: saldo imposta sostitutiva/IRPEF + 1° acconto (40%)
- 31 ottobre: dichiarazione dei redditi (Modello Redditi PF)
- 30 novembre: 2° acconto imposta sostitutiva/IRPEF (60%)
- INPS gestione separata (professionisti/intermediari): 16 giugno 1° acconto, 16 novembre 2° acconto
- INPS artigiani/costruzioni/commercianti/ristorazione (in base a `inpsType`, quote trimestrali): 16 maggio, 20 agosto, 16 novembre, 16 febbraio (anno successivo, saldo) — **non sono scadenze IVA**, sono rate INPS a quota fissa

**Solo ordinario** (forfettario esente ex art.1 c.58 L.190/2014):
- Liquidazione IVA trimestrale: 16 aprile (T1), 16 luglio (T2), 16 ottobre (T3), 16 gennaio anno successivo (T4)
- 16 dicembre: acconto IVA

## Guida Fiscale IT

44 articoli accordion con ricerca live in `MenuView`. Non ristrutturare il formato accordion senza aggiornare tutti gli articoli.

## Test

65 test Vitest coprono la fiscalità IT+ES. Prima di modificare logica fiscale: esegui `npm run test` e verifica che tutti passino.
