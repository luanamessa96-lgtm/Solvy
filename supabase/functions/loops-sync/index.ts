import { getCorsHeaders } from '../_shared/cors.ts';

const LOOPS_API_KEY = Deno.env.get('LOOPS_API_KEY')!;
const LOOPS_BASE = 'https://app.loops.so/api/v1';

// ID delle email transazionali Loops (create via API, non contengono segreti).
const TRANSACTIONAL_IDS = {
  refund: { it: 'cmtibe2zf0gin0jynoqlgwl6x', es: 'cmtibg7dl0g6q0j1s0sxcq4y2' },
  cancellation: { it: 'cmtibgppm0d970j01a5zy9f7m', es: 'cmtibh9fr08l10jww9jdgjmcf' },
} as const;

type Action = 'signup' | 'upgrade_pro' | 'cancellation' | 'update_fatture' | 'update_active' | 'refund';

interface SyncPayload {
  action: Action;
  email: string;
  name?: string;
  paese?: string;     // 'Italy' | 'Spain'
  isPro?: boolean;
  fattureCount?: number;
  amount?: string;
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

async function sendTransactional(
  email: string,
  kind: keyof typeof TRANSACTIONAL_IDS,
  paese: string | undefined,
  dataVariables: Record<string, string>
): Promise<void> {
  const lang = paese === 'Spain' ? 'es' : 'it';
  await loopsRequest('/transactional', 'POST', {
    email,
    transactionalId: TRANSACTIONAL_IDS[kind][lang],
    dataVariables,
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload: SyncPayload = await req.json();
    const { action, email, name, paese, isPro, fattureCount, amount } = payload;

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
        // Il create fallisce con 409 se il contatto esiste già (es. creato da un altro flusso
        // prima di avere isPro/fattureCount) — il fallback deve comunque impostarli, altrimenti
        // il contatto resta per sempre invisibile ai segmenti che filtrano su isPro.
        updateRes = await loopsRequest('/contacts/update', 'PUT', {
          email,
          userGroup: paeseVal,
          paese: paeseVal,
          isPro: false,
          fattureCount: 0,
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
    } else if (action === 'upgrade_pro') {
      // paese/userGroup inclusi anche qui (non solo su 'signup'): se il contatto è stato
      // creato da un update precedente senza mai passare da 'signup' riuscito, resta per
      // sempre senza questi campi — ogni azione che li conosce li ripara.
      await loopsRequest('/contacts/update', 'PUT', {
        email,
        isPro: true,
        ...(paese ? { userGroup: paese === 'Spain' ? 'es' : 'it', paese: paese === 'Spain' ? 'es' : 'it' } : {}),
      });
      await loopsRequest('/events/send', 'POST', {
        email,
        eventName: paese === 'Spain' ? 'upgrade_pro_es' : 'upgrade_pro_it',
      });
    } else if (action === 'cancellation') {
      await loopsRequest('/contacts/update', 'PUT', {
        email,
        isPro: false,
        ...(paese ? { userGroup: paese === 'Spain' ? 'es' : 'it', paese: paese === 'Spain' ? 'es' : 'it' } : {}),
      });
      await loopsRequest('/events/send', 'POST', {
        email,
        eventName: paese === 'Spain' ? 'cancellation_es' : 'cancellation_it',
      });
      await sendTransactional(email, 'cancellation', paese, {
        name: name || (paese === 'Spain' ? 'usuario' : 'utente'),
      });
    } else if (action === 'refund') {
      // Non tocca isPro/fattureCount: la cancellazione vera arriva dal webhook Stripe.
      await sendTransactional(email, 'refund', paese, {
        name: name || (paese === 'Spain' ? 'usuario' : 'utente'),
        amount: amount ?? '0.00',
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
