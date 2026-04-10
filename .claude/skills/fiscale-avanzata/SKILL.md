---
name: fiscale-avanzata
description: Use when writing, reviewing or debugging any fiscal calculation code for Italy (IT) or Spain (ES) in Solvy — tax rates, INPS/RETA contributions, quarterly deadlines, IRPEF/IRPF formulas, VAT types. Contains verified data from official sources (Agenzia Entrate, INPS, AEAT, Seg. Social, BOE).
---

# Fiscale Avanzata — Fonte di Verità Ufficiale

> **Regola di base:** ogni valore numerico in questo file è estratto dai PDF ufficiali indicati.
> Se un valore nel codice diverge da questo file, il codice è SBAGLIATO.
> Tutti gli importi mostrati all'utente devono portare il disclaimer "stimato · può variare".
>
> **Anno di riferimento principale: 2026** — dati 2025 mantenuti per confronto storico.

---

## IT — Regime Forfettario

**Fonte:** Circolare Agenzia Entrate n.32/E del 5/12/2023 + art.1 cc.54-89 Legge n.190/2014 (Legge stabilità 2015) + modifiche Legge bilancio 2023 (art.1 c.54 L.197/2022)

### Accesso e soglie
| Parametro | Valore 2026 | Norma |
|-----------|-------------|-------|
| Soglia ricavi accesso | ≤ €85.000 anno precedente | art.1 c.54 L.190/2014 mod. L.197/2022; confermato L.199/2025 |
| Cessazione immediata | > €100.000 nello stesso anno | art.1 c.71 L.190/2014 |
| Spese lavoro accessorio | ≤ €20.000 lordi | art.1 c.54 lett.b L.190/2014 |
| Reddito lav. dip. causa ostativa | > **€35.000** (era €30.000 fino al 2025) | art.1 c.57 lett.d-bis L.190/2014 mod. L.199/2025 |

> ⚠️ **Novità 2026 (L.199/2025):** Rimborsi spese analitici per trasferte (vitto/alloggio/trasporto) addebitati al cliente **non concorrono più alla base imponibile forfettaria**. Escluderli dal calcolo del reddito imponibile se l'utente indica che li ribalta al cliente con documento separato.

### Calcolo imposta
```
Reddito imponibile = Ricavi × Coefficiente_ATECO
Imposta sostitutiva = Reddito_imponibile × 15%   (o 5% regime agevolato)
```
- Coefficiente ATECO: 40%–86% da Allegato 4 Legge n.190/2014 (valori variano per codice ATECO)
- Coefficiente più comune per professionisti/consulenti: **78%** (es. codice 69–75)
- Imposta sostitutiva **ridotta al 5%**: primi 5 anni di nuova attività (art.1 c.65 L.190/2014)
- Criterio di cassa per imputazione ricavi
- IVA: **esonero totale** — no rivalsa, no dichiarazione annuale, no registri IVA (art.1 c.58 L.190/2014)
- Fatturazione elettronica: **obbligatoria dal 1° gennaio 2024** per tutti i forfettari (art.18 D.L.36/2022)
- Deduzioni spese analitiche: **non ammesse** (forfettizzate nel coefficiente)

---

## IT — INPS Gestione Separata

**Norma istitutiva:** art.2 c.26 Legge 335/1995

### Aliquote 2026 (Circ. INPS n.8 del 03/02/2026) ← VALORI CORRENTI
| Categoria | Aliquota totale | Dettaglio |
|-----------|----------------|-----------|
| Professionisti senza altra copertura | **26,07%** | IVS 25,00% + maternità/malattia 0,72% + ISCRO 0,35% |
| Collaboratori/parasubordinati senza altra copertura (con DIS-COLL) | **35,03%** | IVS 33% + 0,50% + 0,22% + 1,31% |
| Collaboratori senza DIS-COLL | **33,72%** | IVS 33% + 0,50% + 0,22% |
| Pensionati / iscritti altra forma prev. | **24,00%** | — |

**Massimale 2026:** €122.295,00 — **Minimale 2026:** €18.808,00
- Contributo minimo annuo (professionisti 26,07%): €4.903,25

### Storico massimali e minimali
| Anno | Massimale | Minimale | Fonte |
|------|-----------|---------|-------|
| 2024 | €119.650 | €18.415 | Circ. n.24/2024 |
| 2025 | €120.607 | €18.555 | Circ. n.27/2025 |
| **2026** | **€122.295** | **€18.808** | Circ. n.8/2026 |

### Formula contributi INPS (forfettari)
```
Base_INPS = Ricavi × Coefficiente_ATECO
Base_capped = min(Base_INPS, massimale_anno)
Contributi_INPS = Base_capped × 26.07%   (professionista senza altra copertura)
```

---

## IT — IRPEF (Regime Ordinario)

**Norma:** art.11 DPR 917/1986 (TUIR)

### Scaglioni IRPEF 2026 (Legge bilancio 2026 — L.199/2025) ← VALORI CORRENTI
| Reddito imponibile | Aliquota 2026 | Aliquota 2025 | Variazione |
|--------------------|--------------|--------------|------------|
| Fino a €28.000 | **23%** | 23% | invariata |
| Da €28.001 a €50.000 | **33%** | 35% | **-2 pp.** |
| Oltre €50.000 | **43%** | 43% | invariata |

> ⚠️ **Novità 2026:** Il 2° scaglione scende dal 35% al 33% (L.199/2025, art.1).
> Aggiorna tutti i calcoli IRPEF che usavano 35% — il codice con `0.35` per il 2° scaglione è sbagliato per i redditi 2026.

> Nota transitoria: Regioni e Comuni possono mantenere i vecchi 4 scaglioni IRPEF per le addizionali fino al 2028 (L.199/2025).

### Addizionali regionali e comunali
- Le aliquote variano per regione/comune (vedi Allegato C Istruzioni 730/2025 — 7,6 MB)
- In Solvy: mostrare solo il totale IRPEF nazionale; le addizionali sono disclaimer aggiuntive

---

## IT — Scadenze Fiscali

### Regime Forfettario
| Data | Scadenza | Norma |
|------|----------|-------|
| 16 giugno | 1° acconto INPS gest. separata **40%** | art.17 D.lgs.241/1997 |
| 30 giugno | Saldo imposta sostitutiva + saldo INPS | art.17 D.lgs.241/1997 |
| 31 ottobre | Dichiarazione Modello Redditi PF | art.2 DPR 322/1998 |
| 16 novembre | 2° acconto INPS gest. separata **60%** | art.17 D.lgs.241/1997 |
| 30 novembre | 2° acconto imposta sostitutiva **60%** | art.17 D.lgs.241/1997 |

### Regime Ordinario (aggiuntive rispetto a forfettario)
| Data | Scadenza |
|------|----------|
| 16 aprile | Liquidazione IVA T1 (gen–mar) |
| 16 luglio | Liquidazione IVA T2 (apr–giu) |
| 16 ottobre | Liquidazione IVA T3 (lug–set) |
| 16 gennaio (anno+1) | Liquidazione IVA T4 (ott–dic) |
| 16 dicembre | Acconto IVA annuale |

---

## ES — Estimación Directa Simplificada (EDS)

**Fonte:** Manual Práctico de Renta 2024 (NIPO 226-25-004-8), Agencia Tributaria — aggiornato al 14/01/2026

### Gastos deducibles EDS 2024
- Gastos de difícil justificación: **5%** del rendimiento neto previo (art.30 RIRPF)
  - ⚠️ Era 7% in 2023; tornato al 5% per il 2024 (Manual IRPF 2024, p.16)
- Máximo deducción mutualidad alternativa RETA: **€15.266,72** (0,283 × 4.495,50 × 12)

### Modelo 130 — Pago Fraccionado IRPF

**Fonte:** Orden EHA/672/2007 (BOE-A-2007-6032, testo consolidato, ultima mod. 19/02/2015)

```
Casilla 01: Ingresos acumulados año (desde 1 enero al último día del trimestre)
Casilla 02: Gastos deducibles acumulados
Casilla 03: Rendimiento neto = max(01 − 02, 0)
Casilla 04: 20% × casilla 03
Casilla 05: Retenciones e ingresos a cuenta acumulados (anno)
Casilla 06: Pagos fraccionados previos del mismo año
Casilla 07: RESULTADO = 04 − 05 − 06  (se negativo → 0, autoliquidación negativa)
```

**Tipo de retención en facturas:**
- **7%** en los primeros 3 años de inicio de actividad
- **15%** a partir del 4° año

**Plazos Modelo 130** (art.7 Orden EHA/672/2007):
| Trimestre | Plazo |
|-----------|-------|
| T1 (ene–mar) | 1–20 abril |
| T2 (abr–jun) | 1–20 julio |
| T3 (jul–sep) | 1–20 octubre |
| T4 (oct–dic) | 1–30 enero (año siguiente) |

### Modelo 303 — IVA Trimestral

**Fonte:** Instrucciones Modelo 303 — AEAT 2025

**Tipos IVA** (Ley 37/1992 LIVA):
| Tipo | % | Casillas Mod.303 |
|------|---|-----------------|
| General | 21% | 07, 08, 09 |
| Reducido | 10% | 04, 05, 06 |
| Superreducido | 4% | 01, 02, 03 |
| Exento/Cero | 0% | 150, 151, 152 |

**Plazos Modelo 303** (Instrucciones Modelo 303):
| Periodo | Plazo |
|---------|-------|
| T1, T2, T3 | 1–20 del mes siguiente (abril, julio, octubre) |
| T4 | 1–30 enero (año siguiente) |
| Modelo 390 (resumen anual) | 1–30 enero (año siguiente) |

### Declaración Anual IRPF — Modelo 100
- **Plazo Renta 2024:** 2 abril – 30 junio 2025 (con domiciliación: hasta 25 junio 2025)
- Norma: arts. 98 Ley IRPF y 64 Reglamento IRPF

---

## ES — RETA (Régimen Especial Trabajadores Autónomos)

**Norma:** Real Decreto-ley 13/2022 (BOE 27-07-2022) — sistema cotización por rendimientos netos dal 2023

> ⚠️ Il sistema precedente con tarifa plana €80/mese è ABOLITO dal 2023.
> Dal 1° gennaio 2023 si applica la cotización por rendimientos netos previstos.

### Tipos de cotización RETA 2026 (Orden PJC/297/2026, BOE-A-2026-7296, 31/03/2026) ← VALORI CORRENTI
| Contingencia | Tipo 2026 | Tipo 2025 | Variazione |
|--------------|-----------|-----------|------------|
| Contingencias comunes | 28,30% | 28,30% | — |
| Contingencias profesionales (AT/EP) | 1,30% | 1,30% | — |
| Cese de actividad | 0,90% | 0,90% | — |
| Formación profesional | 0,10% | 0,10% | — |
| MEI (Mecanismo Equidad Intergeneracional) | **0,90%** | 0,80% | **+0,10 pp.** |
| **TOTAL** | **31,50%** | 31,40% | +0,10 pp. |

**Base máxima 2026:** €5.101,20/mes (era €4.909,50 nel 2025, +3,9%)
- Tope máximo Régimen General también: €5.101,20/mes (art.2 Orden PJC/297/2026)
- Tope mínimo AT/EP: €1.424,40/mes (≡ SMI 2026 + 1/6)

### Tabla de bases 2026 (selección tramos rilevanti per freelance)
| Rendimientos netos/mes | Base mínima | Base máxima | Cuota min. mensile (~31,50%) |
|----------------------|-------------|-------------|--------------------------|
| ≤ €670 | €653,59 | €718,94 | ~€206 |
| €670 – €900 | €718,95 | €900,00 | ~€227 |
| €900 – €1.166,70 | €849,67 | €1.166,70 | ~€268 |
| €1.166,70 – €1.300 | €950,98 | €1.300,00 | ~€299 |
| €1.700 – €1.850 | €1.143,79 | €1.850,00 | ~€360 |
| €2.760 – €3.190 | €1.437,91 | €3.190,00 | ~€453 |
| > €6.000 | €1.928,10 | €5.101,20 | ~€607 |

> Nota: le basi dei tramos 1-3 (reducida) sono **congelate rispetto al 2025**.

### Storico tipos totales RETA
| Anno | Tipo totale | Base max | Fonte |
|------|------------|----------|-------|
| 2024 | 31,30% | €4.720,50/mes | Orden PCJ/51/2024 |
| 2025 | 31,40% | €4.909,50/mes | Orden PCJ/178/2025 |
| **2026** | **31,50%** | **€5.101,20/mes** | Orden PJC/297/2026 |

**Formula cuota mensile stimata:**
```
Cuota_mensile = Base_elegida × 31.50%   (2026)
// Freelance con rendimientos netos ~1.500€/mes → base min ~€950 → cuota ~€299/mes
```

---

## Scadenze ES — Quadro completo

| Data | Scadenza | Modelo |
|------|----------|--------|
| 20 aprile | IRPF T1 + IVA T1 | 130 + 303 |
| 20 luglio | IRPF T2 + IVA T2 | 130 + 303 |
| 20 ottobre | IRPF T3 + IVA T3 | 130 + 303 |
| 30 gennaio (anno+1) | IRPF T4 + IVA T4 + Resumen IVA | 130 + 303 + 390 |
| 30 giugno | Dichiarazione annuale IRPF | 100 |

---

## Regole obbligatorie nel codice

1. **Disclaimer fiscale obbligatorio** su ogni card/schermata con calcoli → "Importi stimati · possono variare · verifica con commercialista/gestor"
2. **Mai mostrare importi certi** — usare sempre "circa", "stimato", "~"
3. **Aliquote INPS**: usare 26,07% per professionisti IT; la distinzione "con/senza altra copertura" va chiesta in onboarding
4. **Coefficienti ATECO**: richiedere il codice ATECO in onboarding IT; non usare un valore di default senza avviso
5. **RETA base scelta**: il freelance ES sceglie la base nell'intervallo del suo tramo; Solvy calcola su base minima di tramo con disclaimer
6. **Gastos EDS 2024 = 5%** (non 7%): il valore nel CLAUDE.md non specifica l'anno; usare 5% per calcoli 2024
7. **RETA tarifa plana non esiste dal 2023**: non mostrare "tarifa plana €80" a utenti ES

---

## Coefficienti ATECO più comuni (IT)

| Gruppo attività | Coefficiente |
|-----------------|-------------|
| Professionisti, scientifiche, tecniche (es. 62, 63, 69-75) | 78% |
| Commercio al dettaglio e ingrosso | 40% |
| Costruzioni e attività immobiliari | 86% |
| Attività manifatturiere, artigianato | 67% |
| Alberghi, ristoranti (es. 55, 56) | 40% |
| Servizi alle imprese, noleggio | 67% |
| Agenti di commercio (46.1x) | 62% |

**Fonte:** Allegato 4, Legge n.190/2014 (Legge stabilità 2015)

---

## Dati non ancora aggiornati al 2026

| Dato | Stato | Ultimo valore confermato |
|------|-------|-------------------------|
| Addizionali comunali 2026 | Bozza del 24/03/2026 — definitivo dopo 15/04/2026 | Valori 2025 come acconto |
| Addizionali regionali 2026 | La maggior parte conferma 2025; eccezioni: Emilia Romagna, Lazio, Piemonte | Vedi Istruzioni 730/2026 |
| Manual IRPF 2025 (redditi 2025) | Non ancora pubblicato al 10/04/2026 | Manual IRPF 2024 |
| Instrucciones Modelo 303/130 2026 | Solo HTML su AEAT, nessun PDF | Nessuna modifica sostanziale 2026 |
| Gastos EDS 2026 | % da confermare con Manual IRPF 2025 | Usare 5% (valore 2024) come stima |

---

## PDF sorgente

| File | Ente | Anno | Cartella |
|------|------|------|---------|
| `Circolare_32E_Regime_Forfettario_2023.pdf` | Agenzia Entrate | 2023 | Italia/ |
| `Istruzioni_730_2025_IRPEF_redditi2024.pdf` | Agenzia Entrate | 2025 | Italia/ |
| `Istruzioni_730_2026_IRPEF_redditi2025.pdf` | Agenzia Entrate | 2026 | Italia/ |
| `INPS_Gestione_Separata_Aliquote_2024_Circ24.pdf` | INPS Circ.24/2024 | 2024 | Italia/ |
| `INPS_Gestione_Separata_Aliquote_2025_Circ27.pdf` | INPS Circ.27/2025 | 2025 | Italia/ |
| `INPS_Circ8_2026_GestioneSeparata_Aliquote.pdf` | INPS Circ.8/2026 | **2026** | Italia/ |
| `Legge_199_2025_Bilancio_2026.pdf` | GU n.301/2025 | **2026** | Italia/ |
| `Addizionali_Comunali_2026_bozza_24032026.pdf` | Agenzia Entrate | 2026 bozza | Italia/ |
| `AllegatoC_Addizionali_Regionali_Comunali_2025.pdf` | Agenzia Entrate | 2025 | Italia/ |
| `Manual_IRPF_2024_Tomo1.pdf` | Agencia Tributaria | 2024 | Spagna/ |
| `Manual_IRPF_2024_Tomo2_Deducciones_Autonomicas.pdf` | Agencia Tributaria | 2024 | Spagna/ |
| `Instrucciones_Modelo_303_2025.pdf` | AEAT | 2025 | Spagna/ |
| `Modelo_303_Notas_Aclaratorias_2024.pdf` | AEAT | 2024 | Spagna/ |
| `Instrucciones_Modelo_130_BOE_consolidado.pdf` | BOE/AEAT | 2015 | Spagna/ |
| `RETA_Cuotas_Tabla_2021_2025.pdf` | Seguridad Social | 2025 | Spagna/ |
| `Orden_PJC_297_2026_RETA_BOE-A-2026-7296.pdf` | BOE-A-2026-7296 | **2026** | Spagna/ |
| `Cuadro_Tipos_Retencion_IRPF_2026.pdf` | AEAT | **2026** | Spagna/ |
