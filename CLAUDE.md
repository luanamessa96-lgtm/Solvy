# Solvy — Istruzioni per Claude

## Regole fiscali — Verità di riferimento

Questa sezione è la **fonte di verità assoluta** per ogni calcolo, test e verifica fiscale in Solvy. Qualsiasi codice che calcola imposte, contributi, scadenze o importi stimati deve rispettare queste regole.

---

### IT — Regime Forfettario

- **Imposta sostitutiva**: 15% sul reddito imponibile (5% per i primi 5 anni di nuova attività)
- **Base imponibile**: `ricavi × coefficiente di redditività ATECO`
- **INPS gestione separata**: 26,23% sul reddito imponibile
- **IVA**: non applicata sulle fatture, nessun obbligo di liquidazione IVA
- **Deduzioni spese**: non ammesse (forfettizzate nel coefficiente ATECO)
- **Soglia regime**: €85.000 di ricavi annui

**Scadenze annuali:**
| Data | Scadenza |
|------|----------|
| 16 giugno | 1° acconto INPS gestione separata (40%) |
| 30 giugno | Saldo imposta sostitutiva + eventuale saldo INPS |
| 31 ottobre | Dichiarazione redditi — Modello Redditi PF |
| 16 novembre | 2° acconto INPS gestione separata (60%) |
| 30 novembre | 2° acconto imposta sostitutiva (60%) |
| 16 dicembre | Acconto IVA (se dovuto) |

---

### IT — Regime Ordinario

Tutte le scadenze del forfettario **più** IVA trimestrale:

| Data | Scadenza |
|------|----------|
| 16 aprile | Liquidazione IVA T1 (gen–mar) |
| 16 luglio | Liquidazione IVA T2 (apr–giu) |
| 16 ottobre | Liquidazione IVA T3 (lug–set) |
| 16 gennaio (anno +1) | Liquidazione IVA T4 (ott–dic) |

**IRPEF — scaglioni:**
| Reddito imponibile | Aliquota |
|--------------------|---------|
| Fino a €28.000 | 23% |
| Da €28.001 a €50.000 | 35% |
| Oltre €50.000 | 43% |

- **Deduzioni spese analitiche**: ammesse
- **INPS**: gestione separata oppure artigiani/commercianti a seconda del tipo di attività

---

### ES — Estimación Directa Simplificada

- **IRPF trimestrale — Modelo 130**: 20% sul rendimiento neto (`ingresos − gastos deducibles − amortizaciones`)
- **IVA trimestrale — Modelo 303**
- **IVA standard**: 21% (ridotta 10% o 4% per alcune categorie)
- **Retención IRPF sulle fatture**: 7% nei primi 3 anni di attività, 15% dal 4° anno
- **RETA**: tariffa plana €80/mese per i primi 2 anni, poi quota basata sul rendimiento neto stimato (min ~€230, max €500+)

**Scadenze annuali:**
| Data | Scadenza |
|------|----------|
| 20 aprile | Modelo 130 + Modelo 303 T1 (gen–mar) |
| 20 luglio | Modelo 130 + Modelo 303 T2 (apr–giu) |
| 20 ottobre | Modelo 130 + Modelo 303 T3 (lug–set) |
| 30 gennaio (anno +1) | Modelo 130 + Modelo 303 T4 (ott–dic) |
| 30 gennaio (anno +1) | Modelo 390 — Resumen anual IVA |
| 30 giugno | Modelo 100 — Dichiarazione annuale IRPF |

---

### Regole generali (tutti i paesi)

1. **Mai mostrare importi fiscali certi** — ogni valore calcolato deve essere etichettato come "stimato · può variare"
2. **Disclaimer legale obbligatorio** su ogni schermata o card che mostra calcoli fiscali
3. **Suggerire sempre** di verificare con un commercialista (IT) o gestor (ES)
4. **Il paese del profilo è immutabile** dopo la creazione — non prevedere UI o logica per cambiarlo
5. **Un profilo = un paese fiscale** — nessun profilo multi-paese
