---
name: fiscale-es
description: Regole logica fiscale spagnola Solvy: IRPF, RETA, Modelos. Usa quando tocchi calcoli fiscali ES, aliquote, dichiarazioni trimestrali, contributi autonomos, guida fiscale spagnola.
user-invocable: false
---

# Logica Fiscale ES — Regole Solvy

## Regola fondamentale

**Non modificare mai la logica IRPF/RETA/Modelos senza istruzione esplicita.**

Questa logica è testata (ES-17→ES-36 completati, 65 test Vitest). Cambiamenti non autorizzati possono causare calcoli errati per gli utenti spagnoli.

## Regime fiscale: Autónomo

### IRPF
- Ritenuta d'acconto (retención): 15% standard, 7% primi 3 anni nuova attività
- Scaglioni IRPF progressivi (statali + regionali)
- Pagamenti trimestrali: Modelo 130 (estimación directa) o 131 (módulos)

### RETA (Seguridad Social)
- Base di cotización: scelta dall'autonomo tra minima e massima
- Quota mensile: variabile in base alla base scelta
- Sistema de cuotas por ingresos reales (riforma 2023): 15 tranche in base al rendimento netto

### IVA
- Aliquota generale: 21%
- Ridotta: 10%, super-ridotta: 4%
- Trimestrale: Modelo 303
- Annuale: Modelo 390

## Scadenze fiscali ES (Modelos principali)

| Periodo | Modelo | Scadenza |
|---------|--------|----------|
| Q1 (gen-mar) | 303, 130/131 | 20 aprile |
| Q2 (apr-giu) | 303, 130/131 | 20 luglio |
| Q3 (lug-set) | 303, 130/131 | 20 ottobre |
| Q4 (ott-dic) | 303, 130/131, 390, 100 | 30 gennaio |

## Guida Fiscale ES

Articoli ES-17→ES-36 nell'accordion `MenuView`. Visibile solo per profilo Spain. Non modificare la logica di visibilità per paese.

## Test

Esegui `npm run test` prima di modificare qualsiasi logica fiscale. Tutti i 65 test devono passare.
