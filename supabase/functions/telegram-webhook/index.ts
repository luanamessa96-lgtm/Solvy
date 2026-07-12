import { getCorsHeaders } from '../_shared/cors.ts';

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const update = await req.json();
    const message = update?.message;
    if (!message) return new Response('ok');

    const chatId: number = message.chat.id;
    const text: string = message.text ?? '';
    const firstName: string = message.from?.first_name ?? 'ciao';

    if (text.startsWith('/start')) {
      await sendMessage(
        chatId,
        `👋 *Ciao ${firstName}!*\n\nSono *Solvy Alerts* — ti mando notifiche quando arriva un nuovo utente o un nuovo Pro.\n\nUsa /getid per ottenere il tuo Chat ID.`,
      );
    } else if (text.startsWith('/getid')) {
      await sendMessage(chatId, `🆔 Il tuo Chat ID è: \`${chatId}\`\n\nCopialo e impostalo come variabile d'ambiente \`TELEGRAM_CHAT_ID\` su Supabase.`);
    } else {
      await sendMessage(chatId, `ℹ️ Comandi disponibili:\n/start — benvenuto\n/getid — mostra il tuo Chat ID`);
    }

    return new Response('ok', { headers: corsHeaders });
  } catch (err) {
    console.error('telegram-webhook error:', err);
    return new Response('ok'); // sempre 200 a Telegram
  }
});
