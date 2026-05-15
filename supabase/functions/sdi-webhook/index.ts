import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_TOKEN   = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? '';

// Mappa codici SdI → stato Solvy + messaggio leggibile
const SDI_STATUS_MAP: Record<string, { status: string; label: string }> = {
  RC: { status: 'delivered', label: 'Consegnata al destinatario' },
  NS: { status: 'rejected',  label: 'Scartata da SdI' },
  MC: { status: 'failed',    label: 'Mancata consegna — controlla codice SDI o PEC del cliente' },
  DT: { status: 'delivered', label: 'Consegnata (decorrenza termini)' },
  NE: { status: 'delivered', label: 'Esito committente ricevuto' },
  AT: { status: 'sent',      label: 'Attestazione di trasmissione' },
  EC: { status: 'sent',      label: 'Esito committente in lavorazione' },
};

async function sendTelegram(text: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
  });
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = await req.json();
    console.log('sdi-webhook received:', JSON.stringify(body));

    // A-Cube manda eventi con: event, data.uuid, data.marking
    const sdiId      = body?.data?.uuid ?? body?.uuid;
    const eventType  = body?.event ?? body?.type ?? '';
    const marking    = body?.data?.marking ?? body?.marking ?? '';

    if (!sdiId) {
      console.warn('sdi-webhook: nessun uuid nel payload');
      return new Response('ok', { status: 200 });
    }

    // Trova il documento tramite sdi_id
    const { data: doc } = await supabase
      .from('documents')
      .select('id, invoice_number, sdi_status, profiles!inner(name, email)')
      .eq('sdi_id', sdiId)
      .single();

    if (!doc) {
      console.warn('sdi-webhook: documento non trovato per sdi_id', sdiId);
      return new Response('ok', { status: 200 });
    }

    // Determina nuovo stato dal marking SdI o dall'event type
    const mapped = SDI_STATUS_MAP[marking] ?? SDI_STATUS_MAP[eventType];
    const newStatus = mapped?.status ?? 'sent';
    const label     = mapped?.label ?? eventType;

    // Aggiorna solo se lo stato è più avanzato (evita retrocessioni)
    const progression = ['sent', 'failed', 'rejected', 'delivered'];
    const currentIdx  = progression.indexOf(doc.sdi_status);
    const newIdx      = progression.indexOf(newStatus);
    if (newIdx > currentIdx) {
      await supabase.from('documents').update({ sdi_status: newStatus }).eq('id', doc.id);
    }

    // Notifica Telegram per consegna e scarto
    if (newStatus === 'delivered' || newStatus === 'rejected') {
      const icon    = newStatus === 'delivered' ? '✅' : '❌';
      const profile = doc.profiles as { name: string; email: string };
      await sendTelegram(
        `${icon} *Fattura SdI — ${newStatus === 'delivered' ? 'Consegnata' : 'Scartata'}*\n` +
        `👤 ${profile.name} (${profile.email})\n` +
        `📄 Fattura n. ${doc.invoice_number ?? doc.id.slice(0, 8)}\n` +
        `📋 ${label}`
      );
    }

    return new Response('ok', { status: 200 });

  } catch (err) {
    console.error('sdi-webhook error:', err);
    return new Response('error', { status: 500 });
  }
});
