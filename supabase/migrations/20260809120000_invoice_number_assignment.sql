-- Assegnazione atomica del numero fattura lato server.
--
-- Prima di questa migration il numero (profiles.invoice_counters, jsonb per
-- anno) era calcolato e incrementato lato client in CreateFacturaModal.tsx:
-- due sessioni concorrenti potevano leggere lo stesso contatore prima che
-- l'incremento fosse scritto, producendo due fatture con lo stesso numero.
-- Verifactu concatena ogni fattura alla precedente via hash: un numero
-- duplicato o fuori sequenza corrompe la catena da quel punto in poi, quindi
-- l'assegnazione deve essere atomica.
--
-- La funzione gira SECURITY INVOKER (default) apposta: rispetta le policy
-- RLS esistenti su profiles (profiles_select/profiles_update, vedi
-- 20260325120000_enable_rls.sql) invece di bypassarle.
--
-- Nota: l'anno è calcolato server-side in UTC (to_char(now(), 'YYYY')),
-- mentre il vecchio calcolo client-side usava l'anno locale del browser.
-- Può causare un disallineamento di al più un'ora attorno al 31/12-1/1 in
-- alcuni fusi orari — edge case noto, non risolto qui perché irrilevante
-- rispetto al problema che questa migration risolve.

CREATE OR REPLACE FUNCTION public.assign_invoice_number(p_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_counters jsonb;
  v_next int;
BEGIN
  SELECT invoice_counters INTO v_counters
  FROM public.profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile % not found', p_profile_id;
  END IF;

  v_next := COALESCE((v_counters ->> v_year)::int, 0) + 1;

  UPDATE public.profiles
  SET invoice_counters = COALESCE(v_counters, '{}'::jsonb) || jsonb_build_object(v_year, v_next)
  WHERE id = p_profile_id;

  RETURN lpad(v_next::text, 3, '0') || '/' || v_year;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_invoice_number(uuid) TO authenticated;

-- Backstop a livello dati: anche se un bug futuro bypassasse la funzione,
-- due fatture reali (type = 'invoice') dello stesso profilo non possono
-- avere lo stesso invoice_number. Non copre proforma/rettificative, che
-- hanno una propria numerazione separata.
CREATE UNIQUE INDEX IF NOT EXISTS documents_invoice_number_unique
  ON public.documents (profile_id, invoice_number)
  WHERE type = 'invoice';
