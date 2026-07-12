import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import { getCorsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Autentica l'utente passando il JWT direttamente a getUser(token).
    // Usiamo --no-verify-jwt al deploy per bypassare la validazione gateway
    // (che fallisce con le nuove API key sb_publishable_ su alcuni runtime Deno).
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, is_pro')
      .eq('user_id', user.id)
      .limit(1);

    const profile = profiles?.[0];

    if (!profile?.is_pro) {
      return new Response(JSON.stringify({ error: 'Nessun abbonamento Pro attivo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Dati Stripe non trovati' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recupera la subscription attiva
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (!subscriptions.data.length) {
      return new Response(JSON.stringify({ error: 'Nessuna sottoscrizione attiva trovata' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subscription = subscriptions.data[0];

    // Cancella a fine periodo — l'utente mantiene il Pro fino alla scadenza
    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    const cancelAt = updated.cancel_at
      ? new Date(updated.cancel_at * 1000).toISOString()
      : null;

    console.log(`Abbonamento impostato per cancellazione a fine periodo: ${subscription.id}, scade: ${cancelAt}`);

    return new Response(JSON.stringify({
      success: true,
      cancel_at: cancelAt,
      current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('cancel-subscription-end-period error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
