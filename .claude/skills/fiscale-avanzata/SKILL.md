---
name: fiscale-avanzata
description: Use when writing, reviewing or debugging any fiscal calculation code for Italy (IT) or Spain (ES) in Solvy — tax rates, INPS/RETA contributions, quarterly deadlines, IRPEF/IRPF formulas, VAT types. Contains verified data from official sources (Agenzia Entrate, INPS, AEAT, Seg. Social, BOE).
---

# Fiscale Avanzata — Fonte di Verità Ufficiale

> **Regola di base:** ogni valore numerico in questo file è estratto dai PDF ufficiali indicati.
> Se un valore nel codice diverge da questo file, il codice è SBAGLIATO.
> Tutti gli importi mostrati all'utente devono portare il disclaimer "stimato · può variare".

---

## IT — Regime Forfettario

**Fonte:** Circolare Agenzia Entrate n.32/E del 5/12/2023 + art.1 cc.54-89 Legge n.190/2014 (Legge stabilità 2015) + modifiche Legge bilancio 2023 (art.1 c.54 L.197/2022)

### Accesso e soglie
| Parametro | Valore | Norma |
|-----------|--------|-------|
| Soglia ricavi accesso | ≤ €85.000 anno precedente | art.1 c.54 L.190/2014 mod. L.197/2022 |
| Cessazione immediata | > €100.000 nello stesso anno | art.1 c.71 L.190/2014 |
| Spese lavoro accessorio | ≤ €20.000 lordi | art.1 c.54 lett.b L.190/2014 |
| Reddito lav. dip. causa ostativa | > €30.000 | art.1 c.57 lett.d-bis L.190/2014 |

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

**Fonte:** Circolare INPS n.24 del 29/01/2024 + Circolare INPS n.27 del 30/01/2025
**Norma istitutiva:** art.2 c.26 Legge 335/1995

### Aliquote 2024 (Circ. n.24/2024)
| Categoria | Aliquota totale | Dettaglio |
|-----------|----------------|-----------|
| Professionisti senza altra copertura | **26,07%** | IVS 25,00% + aggiuntiva 0,72% + ISCRO 0,35% |
| Collaboratori/parasubordinati senza altra copertura | **35,03%** | 33% + 0,50% + 0,22% + 1,31% |
| Pensionati / iscritti altra forma prev. | **24,00%** | — |

**Massimale 2024:** €119.650,00 — **Minimale 2024:** €18.415,00

### Aliquote 2025 (Circ. n.27/2025)
| Categoria | Aliquota | Variazione vs 2024 |
|-----------|----------|-------------------|
| Professionisti senza altra copertura | **26,07%** | invariato |
| Collaboratori senza altra copertura | **35,03%** | invariato |
| Pensionati / iscritti altra forma | **24,00%** | invariato |

**Massimale 2025:** €120.607,00 — **Minimale 2025:** €18.555,00

### Formula contributi INPS (forfettari)
```
Base_INPS = Ricavi × Coefficiente_ATECO
Contributi_INPS = Base_INPS × 26.07%   (se professionista senza altra copertura)
Contributo_non_superi_massimale = min(Base_INPS, massimale_anno) × aliquota
```

---

## IT — IRPEF (Regime Ordinario)

**Fonte:** Istruzioni Mod. 730/2025 (redditi 2024) — Agenzia Entrate, art.11 DPR 917/1986 (TUIR) modificato da D.lgs. 216/2023 (Legge bilancio 2024)

### Scaglioni IRPEF 2024 (3 scaglioni — riforma 2024)
| Reddito imponibile | Aliquota |
|--------------------|---------|
| Fino a €28.000 | 23% |
| Da €28.001 a €50.000 | 35% |
| Oltre €50.000 | 43% |

> Nota: La riforma D.lgs.216/2023 ha unificato il vecchio primo scaglione (0–15k) e secondo (15k–28k), entrambi al 23%, in un unico scaglione fino a €28.000.

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

**Fonte:** RETA_Cuotas_Tabla_2021_2025.pdf — Seguridad Social
**Norma:** Real Decreto-ley 13/2022 (BOE 27-07-2022) — nuovo sistema da 2023

> ⚠️ Il sistema precedente con tarifa plana €80/mese è ABOLITO dal 2023.
> Dal 1° gennaio 2023 si applica la cotización por rendimientos netos previstos.

### Tipos de cotización RETA 2024 (Orden PCJ/51/2024, BOE 30-01-2024)
| Contingencia | Tipo |
|--------------|------|
| Contingencias comunes | 28,30% |
| Contingencias profesionales | 1,30% |
| Cese de actividad | 0,90% |
| Formación profesional | 0,10% |
| MEI (Mecanismo Equidad Intergeneracional) | 0,70% |
| **TOTAL** | **31,30%** |

**Base máxima 2024:** €4.720,50/mes

### Tipos de cotización RETA 2025 (Orden PCJ/178/2025, BOE 26/02/2025)
| Contingencia | Tipo |
|--------------|------|
| Contingencias comunes | 28,30% |
| Contingencias profesionales | 1,30% |
| Cese de actividad | 0,90% |
| Formación profesional | 0,10% |
| MEI | **0,80%** (+0,10 vs 2024) |
| **TOTAL** | **31,40%** |

**Base máxima 2025:** €4.909,50/mes

### Tabla de bases 2025 (selección tramos rilevanti per freelance)
| Tramo | Rendimientos netos/mes | Base mínima | Base máxima |
|-------|----------------------|-------------|-------------|
| 1 (reducida) | ≤ 670 | 653,59 | 718,94 |
| 2 (reducida) | 670 – 900 | 718,94 | 900,00 |
| 3 (reducida) | 900 – 1.166,70 | 849,67 | 1.166,70 |
| 1 (general) | 1.166,70 – 1.300 | 950,98 | 1.300,00 |
| 6 (general) | 2.030 – 2.330 | 1.143,79 | 2.330,00 |
| 12 (general) | > 6.000 | 1.732,03 | 4.909,50 |

**Formula cuota mensile stimata:**
```
Cuota_mensile = Base_elegida × 31,40%   (2025)
Cuota_mensile = Base_elegida × 31,30%   (2024)
// Freelance con rendimentos netti ~1.500€/mes → base ~1.050€ → cuota ~330€/mes
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

## PDF sorgente

| File | Ente | Anno |
|------|------|------|
| `Circolare_32E_Regime_Forfettario_2023.pdf` | Agenzia Entrate | 2023 |
| `Istruzioni_730_2025_IRPEF_redditi2024.pdf` | Agenzia Entrate | 2025 |
| `INPS_Gestione_Separata_Aliquote_2024_Circ24.pdf` | INPS | 2024 |
| `INPS_Gestione_Separata_Aliquote_2025_Circ27.pdf` | INPS | 2025 |
| `AllegatoC_Addizionali_Regionali_Comunali_2025.pdf` | Agenzia Entrate | 2025 |
| `Manual_IRPF_2024_Tomo1.pdf` | Agencia Tributaria | 2024 |
| `Manual_IRPF_2024_Tomo2_Deducciones_Autonomicas.pdf` | Agencia Tributaria | 2024 |
| `Instrucciones_Modelo_303_2025.pdf` | AEAT | 2025 |
| `Modelo_303_Notas_Aclaratorias_2024.pdf` | AEAT | 2024 |
| `Instrucciones_Modelo_130_BOE_consolidado.pdf` | BOE/AEAT | 2015 |
| `RETA_Cuotas_Tabla_2021_2025.pdf` | Seguridad Social | 2025 |
