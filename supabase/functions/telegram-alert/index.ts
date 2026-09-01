import { getCorsHeaders } from '../_shared/cors.ts';

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;

type AlertType = 'new_user' | 'new_pro' | 'refund' | 'payment_failed';

interface AlertPayload {
  type: AlertType;
  email: string;
  name?: string;
  country?: string;
  plan?: string; // 'monthly' | 'yearly'
  amount?: string;
}

function buildMessage(payload: AlertPayload): string {
  const flag = payload.country === 'Spain' ? '🇪🇸' : '🇮🇹';
  if (payload.type === 'new_user') {
    return `🆕 *Nuovo utente Solvy*\n👤 ${payload.name || 'Senza nome'}\n📧 ${payload.email}\n${flag} ${payload.country || 'Italia'}`;
  }
  if (payload.type === 'new_pro') {
    const planLabel = payload.plan === 'yearly' ? 'Annuale €149,90' : 'Mensile €14,99';
    return `💳 *Nuovo Pro Solvy*\n👤 ${payload.name || 'Senza nome'}\n📧 ${payload.email}\n${flag} ${payload.country || 'Italia'}\n📦 ${planLabel}`;
  }
  if (payload.type === 'refund') {
    return `💸 *Rimborso Solvy*\n👤 ${payload.name || 'Senza nome'}\n📧 ${payload.email}\n${flag} ${payload.country || 'Italia'}\n💶 €${payload.amount ?? '?'}`;
  }
  if (payload.type === 'payment_failed') {
    return `⚠️ *Pro revocato — pagamento fallito*\n👤 ${payload.name || 'Senza nome'}\n📧 ${payload.email}\n${flag} ${payload.country || 'Italia'}\n(3 tentativi Stripe falliti)`;
  }
  return `📢 Alert Solvy: ${JSON.stringify(payload)}`;
}

async function sendTelegram(text: string): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload: AlertPayload = await req.json();
    const message = buildMessage(payload);
    const tgResult = await sendTelegram(message);
    if (!tgResult.ok) console.error('Telegram error:', JSON.stringify(tgResult));
    return new Response(JSON.stringify({ ok: tgResult.ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('telegram-alert error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
