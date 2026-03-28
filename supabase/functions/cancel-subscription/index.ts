import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REFUND_WINDOW_DAYS = 14;

Deno.serve(async (req) => {
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

    // Autentica l'utente tramite JWT Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Recupera profilo con stripe_customer_id e subscription_started_at
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_customer_id, subscription_started_at, is_pro')
      .eq('user_id', user.id)
      .limit(1);

    if (profileError || !profiles?.length) {
      return new Response(JSON.stringify({ error: 'Profilo non trovato' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profile = profiles[0];

    if (!profile.is_pro) {
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

    // Verifica server-side che siano passati meno di 14 giorni
    if (!profile.subscription_started_at) {
      return new Response(JSON.stringify({ error: 'Data di inizio abbonamento non disponibile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startedAt = new Date(profile.subscription_started_at);
    const daysSinceStart = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceStart > REFUND_WINDOW_DAYS) {
      return new Response(JSON.stringify({
        error: `Il periodo di recesso di ${REFUND_WINDOW_DAYS} giorni è scaduto`,
        days_since_start: Math.floor(daysSinceStart),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recupera la sottoscrizione attiva da Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (!subscriptions.data.length) {
      return new Response(JSON.stringify({ error: 'Nessuna sottoscrizione attiva trovata su Stripe' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subscription = subscriptions.data[0];

    // Recupera l'ultima fattura per ottenere il payment_intent da rimborsare
    const latestInvoice = await stripe.invoices.retrieve(
      subscription.latest_invoice as string
    );

    let refundedAmount = 0;

    if (latestInvoice.payment_intent && latestInvoice.amount_paid > 0) {
      const refund = await stripe.refunds.create({
        payment_intent: latestInvoice.payment_intent as string,
        reason: 'requested_by_customer',
      });
      refundedAmount = refund.amount;
      console.log(`Rimborso creato: ${refund.id}, importo: ${refund.amount / 100}€`);
    }

    // Cancella immediatamente la sottoscrizione
    await stripe.subscriptions.cancel(subscription.id);
    console.log(`Sottoscrizione cancellata: ${subscription.id}`);

    // Aggiorna immediatamente is_pro = false nel DB (il webhook farà lo stesso come fallback)
    await supabaseAdmin
      .from('profiles')
      .update({ is_pro: false, subscription_started_at: null })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      success: true,
      refunded_amount_cents: refundedAmount,
      refunded_amount_eur: (refundedAmount / 100).toFixed(2),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('cancel-subscription error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
