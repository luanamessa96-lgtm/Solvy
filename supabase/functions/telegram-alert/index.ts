import { getCorsHeaders } from '../_shared/cors.ts';

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;

type AlertType = 'new_user' | 'new_pro';

interface AlertPayload {
  type: AlertType;
  email: string;
  name?: string;
  country?: string;
  plan?: string; // 'monthly' | 'yearly'
}

function buildMessage(payload: AlertPayload): string {
  const flag = payload.country === 'Spain' ? '🇪🇸' : '🇮🇹';
  if (payload.type === 'new_user') {
    return `🆕 *Nuovo utente Solvy*\n👤 ${payload.name || 'Senza nome'}\n📧 ${payload.email}\n${flag} ${payload.country || 'Italia'}`;
  }
  if (payload.type === 'new_pro') {
    const planLabel = payload.plan === 'yearly' ? 'Annuale €59,99' : 'Mensile €7,99';
    return `💳 *Nuovo Pro Solvy*\n👤 ${payload.name || 'Senza nome'}\n📧 ${payload.email}\n${flag} ${payload.country || 'Italia'}\n📦 ${planLabel}`;
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
