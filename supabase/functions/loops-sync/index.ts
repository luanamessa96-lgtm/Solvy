import { getCorsHeaders } from '../_shared/cors.ts';

const LOOPS_API_KEY = Deno.env.get('LOOPS_API_KEY')!;
const LOOPS_BASE = 'https://app.loops.so/api/v1';

type Action = 'signup' | 'update_pro' | 'upgrade_pro' | 'cancellation' | 'update_fatture' | 'update_active';

interface SyncPayload {
  action: Action;
  email: string;
  name?: string;
  paese?: string;     // 'Italy' | 'Spain'
  isPro?: boolean;
  fattureCount?: number;
}

async function loopsRequest(path: string, method: string, body: unknown): Promise<{ ok: boolean; status: number; body: string }> {
  console.log(`Loops ${method} ${path}`, JSON.stringify(body));
  const res = await fetch(`${LOOPS_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOOPS_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Loops ${method} ${path} failed (${res.status}):`, text);
  } else {
    console.log(`Loops ${method} ${path} ok (${res.status}):`, text);
  }
  return { ok: res.ok, status: res.status, body: text };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload: SyncPayload = await req.json();
    const { action, email, name, paese, isPro, fattureCount } = payload;

    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'signup') {
      const paeseVal = paese === 'Spain' ? 'es' : 'it';
      // Crea contatto — se già esiste (409) aggiorna paese/userGroup per garantire che l'audience filter passi
      const contactRes = await loopsRequest('/contacts/create', 'POST', {
        email,
        ...(name ? { firstName: name } : {}),
        userGroup: paeseVal,
        paese: paeseVal,
        isPro: false,
        fattureCount: 0,
        lastActive: new Date().toISOString(),
      });
      let updateRes = null;
      if (!contactRes.ok) {
        updateRes = await loopsRequest('/contacts/update', 'PUT', {
          email,
          userGroup: paeseVal,
          paese: paeseVal,
        });
      }
      // Spara evento signup — trigger affidabile indipendentemente dall'esistenza del contatto
      const eventRes = await loopsRequest('/events/send', 'POST', {
        email,
        eventName: paese === 'Spain' ? 'signup_es' : 'signup_it',
      });
      return new Response(JSON.stringify({ ok: true, contactRes, updateRes, eventRes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'update_pro') {
      await loopsRequest('/contacts/update', 'PUT', {
        email,
        isPro: isPro ?? true,
      });
    } else if (action === 'upgrade_pro') {
      await loopsRequest('/contacts/update', 'PUT', { email, isPro: true });
      await loopsRequest('/events/send', 'POST', {
        email,
        eventName: paese === 'Spain' ? 'upgrade_pro_es' : 'upgrade_pro_it',
      });
    } else if (action === 'cancellation') {
      await loopsRequest('/contacts/update', 'PUT', { email, isPro: false });
      await loopsRequest('/events/send', 'POST', {
        email,
        eventName: paese === 'Spain' ? 'cancellation_es' : 'cancellation_it',
      });
    } else if (action === 'update_fatture') {
      await loopsRequest('/contacts/update', 'PUT', {
        email,
        fattureCount: fattureCount ?? 0,
        isPro: isPro ?? false,
      });
    } else if (action === 'update_active') {
      await loopsRequest('/contacts/update', 'PUT', {
        email,
        lastActive: new Date().toISOString(),
      });
    } else {
      return new Response(JSON.stringify({ ok: false, error: `unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('loops-sync error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
