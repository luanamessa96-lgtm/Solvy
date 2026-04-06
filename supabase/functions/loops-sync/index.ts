const LOOPS_API_KEY = Deno.env.get('LOOPS_API_KEY')!;
const LOOPS_BASE = 'https://app.loops.so/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'signup' | 'update_pro' | 'update_fatture' | 'update_active';

interface SyncPayload {
  action: Action;
  email: string;
  name?: string;
  paese?: string;     // 'Italy' | 'Spain'
  isPro?: boolean;
  fattureCount?: number;
}

async function loopsRequest(path: string, method: string, body: unknown): Promise<void> {
  const res = await fetch(`${LOOPS_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LOOPS_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Loops ${method} ${path} failed (${res.status}):`, text);
  }
}

Deno.serve(async (req) => {
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
      // Crea contatto in Loops
      await loopsRequest('/contacts/create', 'POST', {
        email,
        firstName: name ?? '',
        userGroup: paese === 'Spain' ? 'es' : 'it',
        paese: paese ?? 'Italy',
        isPro: false,
        fattureCount: 0,
        lastActive: new Date().toISOString(),
      });
    } else if (action === 'update_pro') {
      await loopsRequest('/contacts/update', 'PUT', {
        email,
        isPro: isPro ?? true,
      });
    } else if (action === 'update_fatture') {
      await loopsRequest('/contacts/update', 'PUT', {
        email,
        fattureCount: fattureCount ?? 0,
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
