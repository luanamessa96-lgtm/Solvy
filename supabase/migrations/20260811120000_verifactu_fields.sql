-- Campi Verifactu (ES) su documents, stesso pattern di T38_sdi_fields.sql (IT).
-- Nomi colonne rispecchiano la risposta di POST /verifactu/create dell'API
-- Verifacti (https://www.verifacti.com/docs): { uuid, estado, url, qr, huella }.
-- estado parte da "Pendiente" e va confermato via polling su /verifactu/status
-- (l'API non offre un webhook per lo stato fattura).

alter table documents
  add column if not exists verifactu_status text,
  add column if not exists verifactu_uuid text,
  add column if not exists verifactu_qr text,
  add column if not exists verifactu_qr_url text,
  add column if not exists verifactu_huella text,
  add column if not exists verifactu_sent_at timestamptz;
