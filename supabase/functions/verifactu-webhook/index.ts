import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';

// IMPORTANTE: questa funzione è chiamata da Verifacti (server-to-server), non
// dal frontend Solvy — va deployata con `--no-verify-jwt`, altrimenti
// Supabase la blocca con 401 prima ancora che il codice giri. È un bug
// ricorrente già visto su stripe-webhook (torna verify_jwt=true ad ogni
// redeploy se il flag non viene ripetuto ogni volta): stessa attenzione va
// applicata qui.
const WEBHOOK_SECRET = Deno.env.get('VERIFACTI_WEBHOOK_SECRET') ?? '';

// Verifacti firma ogni notifica con HMAC-SHA256 (hex) nell'header
// X-Webhook-Signature, calcolato sul corpo esatto della richiesta. A-Cube
// (sdi-webhook) non offre questo — qui la verifichiamo perché altrimenti
// chiunque potrebbe forgiare una notifica "Correcta" per una fattura mai
// davvero accettata da AEAT.
async function verifySignature(rawBody: string, signatureHex: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (computedHex.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) diff |= computedHex.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 });

  const rawBody   = await req.text();
  const signature = req.headers.get('X-Webhook-Signature') ?? '';

  if (WEBHOOK_SECRET) {
    const valid = await verifySignature(rawBody, signature);
    if (!valid) {
      console.warn('verifactu-webhook: firma non valida, notifica scartata');
      return new Response('invalid signature', { status: 401 }); // 4xx = Verifacti non ritenta, corretto: un retry non risolverebbe una firma sbagliata
    }
  } else {
    console.warn('verifactu-webhook: VERIFACTI_WEBHOOK_SECRET non configurato — notifica accettata senza verifica firma');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const parsed = JSON.parse(rawBody);
    const items: Array<{ uuid?: string; estado?: string }> = Array.isArray(parsed) ? parsed : [parsed];

    for (const item of items) {
      if (!item?.uuid || !item?.estado) continue;
      const { error, count } = await supabase
        .from('documents')
        .update({ verifactu_status: item.estado }, { count: 'exact' })
        .eq('verifactu_uuid', item.uuid);
      if (error) throw error;
      if (!count) console.warn('verifactu-webhook: nessun documento trovato per uuid', item.uuid);
    }

    // 2xx entro 10s richiesto da Verifacti per considerare la notifica consegnata
    return new Response('ok', { status: 200 });

  } catch (err) {
    // 5xx: Verifacti ritenta (1min/6min/30min) — corretto per errori
    // transitori nostri (es. DB temporaneamente irraggiungibile).
    console.error('verifactu-webhook error:', err);
    return new Response('error', { status: 500 });
  }
});
