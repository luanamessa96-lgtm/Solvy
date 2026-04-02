/** Mapping provincia → regione per tutte le 107 province italiane */
export const IT_PROVINCIA_REGIONE: Record<string, string> = {
  // Abruzzo
  "L'Aquila": "Abruzzo", "Chieti": "Abruzzo", "Pescara": "Abruzzo", "Teramo": "Abruzzo",
  // Basilicata
  "Matera": "Basilicata", "Potenza": "Basilicata",
  // Calabria
  "Catanzaro": "Calabria", "Cosenza": "Calabria", "Crotone": "Calabria",
  "Reggio Calabria": "Calabria", "Vibo Valentia": "Calabria",
  // Campania
  "Avellino": "Campania", "Benevento": "Campania", "Caserta": "Campania",
  "Napoli": "Campania", "Salerno": "Campania",
  // Emilia-Romagna
  "Bologna": "Emilia-Romagna", "Ferrara": "Emilia-Romagna", "Forlì-Cesena": "Emilia-Romagna",
  "Modena": "Emilia-Romagna", "Parma": "Emilia-Romagna", "Piacenza": "Emilia-Romagna",
  "Ravenna": "Emilia-Romagna", "Reggio Emilia": "Emilia-Romagna", "Rimini": "Emilia-Romagna",
  // Friuli-Venezia Giulia
  "Gorizia": "Friuli-Venezia Giulia", "Pordenone": "Friuli-Venezia Giulia",
  "Trieste": "Friuli-Venezia Giulia", "Udine": "Friuli-Venezia Giulia",
  // Lazio
  "Frosinone": "Lazio", "Latina": "Lazio", "Rieti": "Lazio", "Roma": "Lazio", "Viterbo": "Lazio",
  // Liguria
  "Genova": "Liguria", "Imperia": "Liguria", "La Spezia": "Liguria", "Savona": "Liguria",
  // Lombardia
  "Bergamo": "Lombardia", "Brescia": "Lombardia", "Como": "Lombardia", "Cremona": "Lombardia",
  "Lecco": "Lombardia", "Lodi": "Lombardia", "Mantova": "Lombardia", "Milano": "Lombardia",
  "Monza e Brianza": "Lombardia", "Pavia": "Lombardia", "Sondrio": "Lombardia", "Varese": "Lombardia",
  // Marche
  "Ancona": "Marche", "Ascoli Piceno": "Marche", "Fermo": "Marche",
  "Macerata": "Marche", "Pesaro e Urbino": "Marche",
  // Molise
  "Campobasso": "Molise", "Isernia": "Molise",
  // Piemonte
  "Alessandria": "Piemonte", "Asti": "Piemonte", "Biella": "Piemonte", "Cuneo": "Piemonte",
  "Novara": "Piemonte", "Torino": "Piemonte", "Verbano-Cusio-Ossola": "Piemonte", "Vercelli": "Piemonte",
  // Puglia
  "Bari": "Puglia", "Barletta-Andria-Trani": "Puglia", "Brindisi": "Puglia",
  "Foggia": "Puglia", "Lecce": "Puglia", "Taranto": "Puglia",
  // Sardegna
  "Cagliari": "Sardegna", "Nuoro": "Sardegna", "Oristano": "Sardegna",
  "Sassari": "Sardegna", "Sud Sardegna": "Sardegna",
  // Sicilia
  "Agrigento": "Sicilia", "Caltanissetta": "Sicilia", "Catania": "Sicilia", "Enna": "Sicilia",
  "Messina": "Sicilia", "Palermo": "Sicilia", "Ragusa": "Sicilia", "Siracusa": "Sicilia", "Trapani": "Sicilia",
  // Toscana
  "Arezzo": "Toscana", "Firenze": "Toscana", "Grosseto": "Toscana", "Livorno": "Toscana",
  "Lucca": "Toscana", "Massa-Carrara": "Toscana", "Pisa": "Toscana",
  "Pistoia": "Toscana", "Prato": "Toscana", "Siena": "Toscana",
  // Trentino-Alto Adige
  "Bolzano": "Trentino-Alto Adige", "Trento": "Trentino-Alto Adige",
  // Umbria
  "Perugia": "Umbria", "Terni": "Umbria",
  // Valle d'Aosta
  "Aosta": "Valle d'Aosta",
  // Veneto
  "Belluno": "Veneto", "Padova": "Veneto", "Rovigo": "Veneto",
  "Treviso": "Veneto", "Venezia": "Veneto", "Verona": "Veneto", "Vicenza": "Veneto",
};

export const IT_PROVINCE = Object.keys(IT_PROVINCIA_REGIONE).sort();

export function getRegionFromProvince(province: string | undefined): string | undefined {
  if (!province) return undefined;
  return IT_PROVINCIA_REGIONE[province];
}
