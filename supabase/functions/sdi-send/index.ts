import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';

const ACUBE_EMAIL    = Deno.env.get('ACUBE_EMAIL') ?? '';
const ACUBE_PASSWORD = Deno.env.get('ACUBE_PASSWORD') ?? '';
const ACUBE_SANDBOX  = Deno.env.get('ACUBE_SANDBOX') !== 'false';
const ACUBE_BASE     = ACUBE_SANDBOX ? 'https://api-sandbox.acubeapi.com' : 'https://api.acubeapi.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toFixed(2); }
function fmtRate(n: number): string { return n.toFixed(2); }

function parseAddress(address: string) {
  const parts = address.split(',');
  if (parts.length >= 2) {
    const indirizzo = parts.slice(0, -1).join(',').trim();
    const lastPart = parts[parts.length - 1].trim();
    const capMatch = lastPart.match(/\b(\d{5})\b/);
    if (capMatch) {
      return { indirizzo, cap: capMatch[1], comune: lastPart.replace(capMatch[1], '').trim() || 'ND' };
    }
    return { indirizzo, cap: '00000', comune: lastPart || 'ND' };
  }
  return { indirizzo: address || 'ND', cap: '00000', comune: 'ND' };
}

// ─── A-Cube auth ─────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const res = await fetch(`${ACUBE_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: ACUBE_EMAIL, password: ACUBE_PASSWORD }),
  });
  if (!res.ok) throw new Error(`A-Cube auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.token ?? data.access_token ?? data.jwt;
}

// ─── Registra fiscal_id utente (idempotente) ──────────────────────────────────

async function ensureFiscalId(token: string, fiscalId: string, name: string, email: string) {
  const check = await fetch(`${ACUBE_BASE}/business-registry-configurations/${fiscalId}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  if (check.status === 200) return;

  const res = await fetch(`${ACUBE_BASE}/business-registry-configurations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      fiscal_id: fiscalId,
      name,
      email,
      customer_invoice_enabled: true,
      supplier_invoice_enabled: false,
    }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Registrazione fiscal_id fallita: ${res.status} ${await res.text()}`);
  }
}

// ─── Costruisce payload FatturaPA per A-Cube ──────────────────────────────────

// deno-lint-ignore no-explicit-any
function buildPayload(doc: any, profile: any) {
  const isCreditNote  = doc.type === 'credit_note';
  const isForfettario = (doc.doc_regime ?? profile.regime ?? 'forfettario') !== 'ordinario';
  const ivaRate       = isForfettario ? 0 : (doc.iva_rate ?? 22);
  const regimeFiscale = isForfettario ? 'RF19' : 'RF01';
  const tipoDoc       = isCreditNote ? 'TD04' : 'TD01';

  const base         = isCreditNote ? -doc.amount : doc.amount;
  const rivalsa      = (!isCreditNote && doc.rivalsa_inps) ? base * 0.04 : 0;
  const imponibile   = base + rivalsa;
  const iva          = isForfettario ? 0 : imponibile * (ivaRate / 100);
  const bollo        = (!isCreditNote && doc.marca_bollo) ? 2 : 0;
  const ritenuta     = (!isCreditNote && doc.ritenuta) ? imponibile * 0.20 : 0;
  const totale       = imponibile + iva + bollo - ritenuta;

  const piva         = (profile.piva || '').replace(/\s/g, '');
  const invoiceNum   = doc.invoice_number || doc.id.slice(0, 8).toUpperCase();

  const profAddr     = parseAddress(profile.address || '');
  const clientAddr   = parseAddress(doc.client_address || '');

  const causale: string[] = [];
  if (isForfettario && !isCreditNote)
    causale.push("Operazione effettuata ai sensi dell'art. 1, commi 54-89, della Legge 190/2014 - Regime forfettario. Imposta non dovuta.");
  if (isCreditNote && doc.category)
    causale.push(`Nota di credito a storno fattura n. ${doc.category}`);

  const linee = [
    {
      numero_linea: 1,
      descrizione: doc.title,
      quantita: '1.00',
      prezzo_unitario: fmt(base),
      prezzo_totale: fmt(base),
      aliquota_iva: fmtRate(ivaRate),
      ...(isForfettario ? { natura: 'N2.2' } : {}),
    },
    ...(rivalsa > 0 ? [{
      numero_linea: 2,
      descrizione: 'Rivalsa INPS 4%',
      quantita: '1.00',
      prezzo_unitario: fmt(rivalsa),
      prezzo_totale: fmt(rivalsa),
      aliquota_iva: fmtRate(ivaRate),
      ...(isForfettario ? { natura: 'N2.2' } : {}),
    }] : []),
  ];

  return {
    fattura_elettronica_header: {
      dati_trasmissione: {
        codice_destinatario: doc.client_sdi || '0000000',
        ...(doc.client_pec && doc.client_pec.includes('@') && doc.client_pec.length >= 7 ? { pec_destinatario: doc.client_pec.trim() } : {}),
      },
      cedente_prestatore: {
        dati_anagrafici: {
          id_fiscale_iva: { id_paese: 'IT', id_codice: piva },
          ...(profile.codice_fiscale ? { codice_fiscale: profile.codice_fiscale } : {}),
          anagrafica: { denominazione: profile.name },
          regime_fiscale: regimeFiscale,
        },
        sede: {
          indirizzo: profAddr.indirizzo || 'ND',
          cap: profAddr.cap,
          comune: profAddr.comune || 'ND',
          nazione: 'IT',
        },
      },
      cessionario_committente: {
        dati_anagrafici: {
          ...(doc.client_piva ? { id_fiscale_iva: { id_paese: 'IT', id_codice: doc.client_piva } } : {}),
          ...(doc.client_cf && doc.client_cf.length <= 16 ? { codice_fiscale: doc.client_cf } : {}),
          anagrafica: { denominazione: doc.client || 'Cliente' },
        },
        sede: {
          indirizzo: clientAddr.indirizzo || 'ND',
          cap: clientAddr.cap || '00000',
          comune: clientAddr.comune || 'ND',
          nazione: 'IT',
        },
      },
    },
    fattura_elettronica_body: [{
      dati_generali: {
        dati_generali_documento: {
          tipo_documento: tipoDoc,
          divisa: 'EUR',
          data: doc.date.split('T')[0],
          numero: invoiceNum,
          importo_totale_documento: fmt(totale),
          ...(causale.length ? { causale } : {}),
          ...(doc.ritenuta && !isCreditNote ? {
            dati_ritenuta: [{
              tipo_ritenuta: 'RT01',
              importo_ritenuta: fmt(ritenuta),
              aliquota_ritenuta: '20.00',
              causale_pagamento: 'A',
            }],
          } : {}),
          ...(doc.marca_bollo ? {
            dati_bollo: { bollo_virtuale: 'SI', importo_bollo: '2.00' },
          } : {}),
        },
      },
      dati_beni_servizi: {
        dettaglio_linee: linee,
        dati_riepilogo: [{
          aliquota_iva: fmtRate(ivaRate),
          ...(isForfettario ? { natura: 'N2.2' } : {}),
          imponibile_importo: fmt(imponibile),
          imposta: fmt(iva),
          ...(!isForfettario ? { esigibilita_iva: 'I' } : {}),
          ...(isForfettario ? { riferimento_normativo: 'Regime forfettario art. 1, c. 54-89, L. 190/2014' } : {}),
        }],
      },
    }],
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
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
      .select('sdi_status')
      .eq('id', document_id)
      .single();
    if (existing?.sdi_status === 'sent' || existing?.sdi_status === 'delivered') {
      return new Response(JSON.stringify({ error: 'Fattura già inviata a SdI' }), { status: 409, headers: corsHeaders });
    }

    // Carica documento
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();
    if (docErr || !doc) return new Response(JSON.stringify({ error: 'Documento non trovato' }), { status: 404, headers: corsHeaders });

    // Carica profilo separatamente
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('name, email, piva, codice_fiscale, regime, address')
      .eq('id', doc.profile_id)
      .single();
    if (profErr || !profile) return new Response(JSON.stringify({ error: 'Profilo non trovato' }), { status: 404, headers: corsHeaders });
    const fiscalId = (profile.piva || profile.codice_fiscale || '').replace(/\s/g, '');
    if (!fiscalId) return new Response(JSON.stringify({ error: 'Profilo incompleto: P.IVA o Codice Fiscale obbligatori' }), { status: 422, headers: corsHeaders });

    // Auth A-Cube
    const token = await getToken();

    // Registra fiscal_id se non esiste
    await ensureFiscalId(token, fiscalId, profile.name, profile.email);

    // Invia fattura
    const payload = buildPayload(doc, profile);
    const sendRes = await fetch(`${ACUBE_BASE}/invoices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      console.error('A-Cube invoice error:', sendRes.status, errBody);
      return new Response(JSON.stringify({ error: `Errore A-Cube: ${sendRes.status}`, detail: errBody }), { status: 502, headers: corsHeaders });
    }

    const invoice = await sendRes.json();
    const sdiId = invoice.uuid;

    // Aggiorna documento
    await supabase.from('documents').update({
      sdi_status: 'sent',
      sdi_id: sdiId,
      sdi_sent_at: new Date().toISOString(),
    }).eq('id', document_id);

    return new Response(JSON.stringify({ ok: true, sdi_id: sdiId }), { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('sdi-send error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
