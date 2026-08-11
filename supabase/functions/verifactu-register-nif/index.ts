import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import { getCorsHeaders } from '../_shared/cors.ts';

// API key di ACCOUNT (una sola, dalla dashboard Verifacti) — usata solo per
// gestire i NIF, mai per creare fatture. Ogni NIF ha una propria API key
// dedicata, ottenuta qui sotto e salvata via Vault (vedi
// 20260811130000_verifactu_nif_profile_fields.sql). Non confondere le due.
const VERIFACTI_ACCOUNT_API_KEY = Deno.env.get('VERIFACTI_ACCOUNT_API_KEY') ?? '';
const VERIFACTI_BASE            = 'https://api.verifacti.com';
// 'test' finché non si decide di attivare Verifactu per utenti reali —
// registrare un NIF in 'prod' genera subito un addebito Verifacti reale.
const VERIFACTI_ENTORNO         = Deno.env.get('VERIFACTI_ENTORNO') ?? 'test';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const { profile_id } = await req.json();
    if (!profile_id) return new Response(JSON.stringify({ error: 'profile_id mancante' }), { status: 400, headers: corsHeaders });

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('name, email, piva, nie, street, cap, city, province, verifactu_nif_status')
      .eq('id', profile_id)
      .single();
    if (profErr || !profile) return new Response(JSON.stringify({ error: 'Profilo non trovato' }), { status: 404, headers: corsHeaders });

    const nif = (profile.piva || profile.nie || '').replace(/\s/g, '').toUpperCase();
    if (!nif) return new Response(JSON.stringify({ error: 'Profilo incompleto: NIF/NIE obbligatorio' }), { status: 422, headers: corsHeaders });

    if (profile.verifactu_nif_status === 'active') {
      return new Response(JSON.stringify({ error: 'NIF già registrato su Verifacti' }), { status: 409, headers: corsHeaders });
    }

    // Registra il NIF (idempotente lato nostro: se Verifacti dice che esiste
    // già, ignoriamo l'errore e proseguiamo a recuperare comunque la key —
    // l'endpoint di registrazione non ha una forma di errore "duplicato"
    // documentata in modo affidabile, quindi non blocchiamo su questo).
    const createRes = await fetch(`${VERIFACTI_BASE}/nifs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERIFACTI_ACCOUNT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        nif,
        nombre: profile.name || 'ND',
        entorno: VERIFACTI_ENTORNO,
        hacienda: 'verifactu',
        ...(profile.street ? { direccion: profile.street } : {}),
        ...(profile.cap ? { cp: profile.cap } : {}),
        ...(profile.city ? { poblacion: profile.city } : {}),
        ...(profile.province ? { provincia: profile.province } : {}),
      }]),
    });
    if (!createRes.ok) {
      console.warn('verifactu-register-nif: POST /nifs non-ok, proseguo comunque a recuperare la key', createRes.status, await createRes.text());
    }

    // Recupera la API key dedicata a questo NIF
    const keyRes = await fetch(`${VERIFACTI_BASE}/nifs/keys/${VERIFACTI_ENTORNO}/${nif}`, {
      headers: { 'Authorization': `Bearer ${VERIFACTI_ACCOUNT_API_KEY}` },
    });
    if (!keyRes.ok) {
      const errBody = await keyRes.text();
      console.error('verifactu-register-nif: GET /nifs/keys fallita', keyRes.status, errBody);
      return new Response(JSON.stringify({ error: `Registrazione NIF fallita: ${keyRes.status}`, detail: errBody }), { status: 502, headers: corsHeaders });
    }
    const { api_key: nifApiKey } = await keyRes.json();
    if (!nifApiKey) return new Response(JSON.stringify({ error: 'Verifacti non ha restituito una API key' }), { status: 502, headers: corsHeaders });

    // Salva la key cifrata via Vault (mai in chiaro su profiles)
    const { error: vaultErr } = await supabase.rpc('verifactu_set_api_key', {
      p_profile_id: profile_id,
      p_api_key: nifApiKey,
    });
    if (vaultErr) throw vaultErr;

    await supabase.from('profiles').update({
      verifactu_nif: nif,
      verifactu_entorno: VERIFACTI_ENTORNO,
      verifactu_nif_status: 'active',
    }).eq('id', profile_id);

    return new Response(JSON.stringify({ ok: true, nif, entorno: VERIFACTI_ENTORNO }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('verifactu-register-nif error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
