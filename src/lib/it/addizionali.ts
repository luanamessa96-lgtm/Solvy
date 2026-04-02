/** Aliquote addizionale regionale IRPEF 2024 (aliquota base) */
export const IT_ADDIZIONALI_REGIONALI: Record<string, number> = {
  "Abruzzo": 0.0173,
  "Basilicata": 0.0123,
  "Calabria": 0.0203,
  "Campania": 0.0203,
  "Emilia-Romagna": 0.0133,
  "Friuli-Venezia Giulia": 0.0070,
  "Lazio": 0.0333,
  "Liguria": 0.0123,
  "Lombardia": 0.0173,
  "Marche": 0.0153,
  "Molise": 0.0203,
  "Piemonte": 0.0162,
  "Puglia": 0.0203,
  "Sardegna": 0.0123,
  "Sicilia": 0.0123,
  "Toscana": 0.0142,
  "Trentino-Alto Adige": 0.0123,
  "Umbria": 0.0153,
  "Valle d'Aosta": 0.0070,
  "Veneto": 0.0123,
};

export const IT_REGIONI = Object.keys(IT_ADDIZIONALI_REGIONALI).sort();

export const ADDIZIONALI_DEFAULT = 0.023; // fallback se regione non impostata

export function getAddizionaliRate(region: string | undefined): number {
  if (!region) return ADDIZIONALI_DEFAULT;
  return IT_ADDIZIONALI_REGIONALI[region] ?? ADDIZIONALI_DEFAULT;
}
