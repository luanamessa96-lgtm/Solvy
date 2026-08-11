-- Verifacti API key per-NIF: verifactu-send userà una key diversa per ogni
-- NIF/utente (vedi memoria di progetto per l'architettura completa), non
-- una key globale. È un secret di terze parti — se esposto, chiunque può
-- creare fatture (e generare costi reali) a nome dell'utente.
--
-- Una colonna in chiaro su profiles NON basta: il progetto ha già un GRANT
-- SELECT/UPDATE a livello di intera tabella su profiles (vedi
-- 20260712000000_grant_privileges.sql), e un REVOKE su una singola colonna
-- viene scavalcato dal grant più ampio già concesso — provato empiricamente
-- prima di scrivere questo file. Serve isolamento reale, non solo un altro
-- controllo di permessi sulla stessa tabella.
--
-- Soluzione: il valore vive cifrato a riposo in Supabase Vault
-- (vault.secrets, incluso di default in ogni progetto). profiles tiene solo
-- l'id del secret (verifactu_secret_id) — inutile senza accesso a vault.
-- Lettura/scrittura passano SOLO da due funzioni SECURITY DEFINER il cui
-- EXECUTE è concesso esclusivamente a service_role (mai anon/authenticated,
-- altrimenti chiunque potrebbe leggere la key di un altro profilo
-- passandone semplicemente l'id).

create extension if not exists supabase_vault cascade;

alter table profiles
  add column if not exists verifactu_secret_id uuid;

create or replace function public.verifactu_set_api_key(p_profile_id uuid, p_api_key text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_existing uuid;
begin
  select verifactu_secret_id into v_existing from public.profiles where id = p_profile_id;

  if v_existing is not null then
    perform vault.update_secret(v_existing, p_api_key);
  else
    update public.profiles
    set verifactu_secret_id = vault.create_secret(p_api_key, 'verifactu_api_key_' || p_profile_id::text)
    where id = p_profile_id;
  end if;
end;
$$;

create or replace function public.verifactu_get_api_key(p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_key text;
begin
  select ds.decrypted_secret into v_key
  from vault.decrypted_secrets ds
  join public.profiles p on p.verifactu_secret_id = ds.id
  where p.id = p_profile_id;

  return v_key;
end;
$$;

revoke execute on function public.verifactu_set_api_key(uuid, text) from public, anon, authenticated;
revoke execute on function public.verifactu_get_api_key(uuid) from public, anon, authenticated;
grant execute on function public.verifactu_set_api_key(uuid, text) to service_role;
grant execute on function public.verifactu_get_api_key(uuid) to service_role;
