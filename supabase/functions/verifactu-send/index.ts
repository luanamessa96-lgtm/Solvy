import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import { getCorsHeaders } from '../_shared/cors.ts';

const VERIFACTI_BASE = 'https://api.verifacti.com';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toFixed(2); }

// Verifacti vuole fecha_expedicion = data odierna reale (vincolo esplicito in
// doc, non la data che l'utente ha messo sulla fattura). fecha_operacion può
// invece essere la data effettiva del servizio/operazione.
function fmtDateDMY(d: Date): string {
  const day   = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getUTCFullYear()}`;
}

// ─── Costruisce payload POST /verifactu/create ────────────────────────────────

// deno-lint-ignore no-explicit-any
function buildPayload(doc: any, profile: any, originalDoc: any | null) {
  const isRectificativa = doc.type === 'factura_rectificativa';
  const isCanarias      = profile.territory === 'canarias';
  const impuesto         = isCanarias ? '03' : '01'; // 01=IVA, 03=IGIC (Canarias)
  const ivaRate          = doc.iva_rate ?? (isCanarias ? 7 : 21);

  const base    = doc.amount;
  const cuota   = base * (ivaRate / 100);
  const total   = base + cuota; // retención IRPF NON sottratta: lo schema Verifacti
                                 // non ha un campo per la retención, è irrilevante
                                 // per la registrazione IVA/AEAT (verificato in doc:
                                 // nessun campo di ritenuta in tutto il payload).

  const invoiceNum = doc.invoice_number || doc.id.slice(0, 8).toUpperCase();
  const clientNif  = (doc.client_piva || '').replace(/\s/g, '').toUpperCase();

  return {
    serie: '',
    numero: invoiceNum,
    fecha_expedicion: fmtDateDMY(new Date()),
    fecha_operacion: fmtDateDMY(new Date(doc.date)),
    tipo_factura: isRectificativa ? 'R4' : (clientNif ? 'F1' : 'F2'), // R4 = "resto": Solvy
      // non cattura ancora il motivo legale specifico (art. 80.1/80.2/80.3/80.4)
      // per le rectificativas, quindi usiamo il codice generico. Da rivedere se
      // si costruisce una UI dedicata per scegliere il motivo.
      // F2 (simplificada) quando manca il NIF cliente: F1 senza nif/id_otro
      // viene rifiutato da Verifacti con 400 — F2 è pensata apposta per questo
      // caso invece di forzare un id_otro posticcio.
    descripcion: (doc.title || 'Factura').slice(0, 500),
    ...(clientNif ? {
      nif: clientNif,
      // Verifacti valida di default (validar_destinatario=true) che il NIF
      // cliente sia censito in AEAT, e AEAT rifiuta l'invio se non lo è.
      // Molti clienti reali (privati, stranieri) non compaiono in quel
      // censo pur essendo fatture legittime — disattivata di proposito per
      // non bloccare l'invio di fatture valide. Riconsiderare se in futuro
      // serve un controllo più stretto lato Solvy.
      validar_destinatario: false,
    } : {}),
    ...(doc.client ? { nombre: doc.client.slice(0, 120) } : {}),
    lineas: [{
      base_imponible: fmt(base),
      tipo_impositivo: String(ivaRate),
      cuota_repercutida: fmt(cuota),
      impuesto,
    }],
    importe_total: fmt(total),
    ...(isRectificativa ? {
      tipo_rectificativa: 'I', // "por diferencias" — non richiede importe_rectificativa
      ...(originalDoc ? {
        // Schema di facturas_rectificadas non confermato a fondo in doc
        // (solo elencato come "array", non espanso) — best effort che
        // rispecchia la struttura standard AEAT (IDFactura). Da verificare
        // contro la sandbox reale prima del primo invio vero.
        facturas_rectificadas: [{
          serie: '',
          numero: originalDoc.invoice_number || originalDoc.id.slice(0, 8).toUpperCase(),
          fecha_expedicion: fmtDateDMY(new Date(originalDoc.date)),
        }],
      } : {}),
    } : {}),
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const { document_id } = await req.json();
    if (!document_id) return new Response(JSON.stringify({ error: 'document_id mancante' }), { status: 400, headers: corsHeaders });

    // Blocca doppio invio
    const { data: existing } = await supabase
      .from('documents')
      .select('verifactu_status')
      .eq('id', document_id)
      .single();
    if (existing?.verifactu_status === 'Pendiente' || existing?.verifactu_status === 'Correcta') {
      return new Response(JSON.stringify({ error: 'Fattura già inviata a Verifactu' }), { status: 409, headers: corsHeaders });
    }

    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();
    if (docErr || !doc) return new Response(JSON.stringify({ error: 'Documento non trovato' }), { status: 404, headers: corsHeaders });

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, territory, verifactu_nif, verifactu_nif_status')
      .eq('id', doc.profile_id)
      .single();
    if (profErr || !profile) return new Response(JSON.stringify({ error: 'Profilo non trovato' }), { status: 404, headers: corsHeaders });
    if (profile.verifactu_nif_status !== 'active') {
      return new Response(JSON.stringify({ error: 'NIF non ancora registrato su Verifacti — eseguire prima verifactu-register-nif' }), { status: 422, headers: corsHeaders });
    }

    let originalDoc = null;
    if (doc.type === 'factura_rectificativa' && doc.category) {
      const { data } = await supabase
        .from('documents')
        .select('invoice_number, id, date')
        .eq('profile_id', doc.profile_id)
        .or(`invoice_number.eq.${doc.category},id.eq.${doc.category}`)
        .limit(1)
        .maybeSingle();
      originalDoc = data ?? null;
    }

    // API key dedicata a questo NIF (mai una key globale, vedi verifactu-register-nif)
    const { data: nifApiKey, error: keyErr } = await supabase.rpc('verifactu_get_api_key', { p_profile_id: doc.profile_id });
    if (keyErr || !nifApiKey) {
      return new Response(JSON.stringify({ error: 'API key Verifacti non trovata per questo profilo' }), { status: 502, headers: corsHeaders });
    }

    const payload = buildPayload(doc, profile, originalDoc);

    // Factura simplificada (F2, senza NIF) ammessa solo fino a 3.000€ (RD
    // 1619/2012 art. 4) — oltre quella soglia Verifacti rifiuta comunque
    // l'invio: blocchiamo prima con un messaggio chiaro invece del 400 generico.
    if (!payload.nif && parseFloat(payload.importe_total) > 3000) {
      return new Response(JSON.stringify({ error: 'NIF cliente mancante: obbligatorio per fatture superiori a 3.000€' }), { status: 422, headers: corsHeaders });
    }

    const sendRes = await fetch(`${VERIFACTI_BASE}/verifactu/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nifApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': doc.id, // protegge da doppio invio dello stesso documento
      },
      body: JSON.stringify(payload),
    });

    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      console.error('Verifacti invoice error:', sendRes.status, errBody);
      return new Response(JSON.stringify({ error: `Errore Verifacti: ${sendRes.status}`, detail: errBody }), { status: 502, headers: corsHeaders });
    }

    const result = await sendRes.json();

    await supabase.from('documents').update({
      verifactu_status: result.estado,
      verifactu_uuid: result.uuid,
      verifactu_qr: result.qr,
      verifactu_qr_url: result.url,
      verifactu_huella: result.huella,
      verifactu_sent_at: new Date().toISOString(),
    }).eq('id', document_id);

    return new Response(JSON.stringify({ ok: true, uuid: result.uuid, estado: result.estado }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('verifactu-send error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
