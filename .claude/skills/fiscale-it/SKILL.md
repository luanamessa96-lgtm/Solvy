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

Le scadenze sono hardcodate nel calendario. Non modificare le date senza verifica normativa:
- 16 marzo: IVA annuale
- 30 aprile: dichiarazione redditi (forfettario semplificato)
- 30 giugno: IRPEF saldo + 1° acconto
- 30 novembre: IRPEF 2° acconto
- Trimestrali IVA: 16 maggio, 20 agosto, 16 novembre

## Guida Fiscale IT

44 articoli accordion con ricerca live in `MenuView`. Non ristrutturare il formato accordion senza aggiornare tutti gli articoli.

## Test

65 test Vitest coprono la fiscalità IT+ES. Prima di modificare logica fiscale: esegui `npm run test` e verifica che tutti passino.
