-- Colonne mancanti su profiles: usate da verifactu-register-nif e verifactu-send
-- (vedi supabase/functions/verifactu-register-nif/index.ts, righe 86-88) ma mai
-- create da nessuna migration — 20260811130000 aveva aggiunto solo
-- verifactu_secret_id, dimenticando queste tre. Mai notato prima perché la
-- Fase 2 non era ancora stata eseguita contro l'API Verifacti vera.

alter table profiles
  add column if not exists verifactu_nif text,
  add column if not exists verifactu_entorno text,
  add column if not exists verifactu_nif_status text;
