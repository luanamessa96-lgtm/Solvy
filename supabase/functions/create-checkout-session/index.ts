import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Recupera l'utente dal JWT Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const { price_id, success_url, cancel_url, promo_code } = await req.json();
    if (!price_id) {
      return new Response(JSON.stringify({ error: 'Missing price_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usa service role per leggere/scrivere stripe_customer_id senza RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Cerca se esiste già un customer Stripe per questo utente
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .limit(1);

    let stripeCustomerId = profiles?.[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Crea nuovo customer Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Salva stripe_customer_id su tutti i profili dell'utente
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', user.id);
    }

    // Se c'è un codice promo, lo risolve in ID Stripe
    let resolvedPromoId: string | null = null;
    if (promo_code) {
      const promos = await stripe.promotionCodes.list({ code: promo_code.trim().toUpperCase(), limit: 1, active: true });
      if (promos.data.length > 0) {
        resolvedPromoId = promos.data[0].id;
      }
    }

    // Crea la sessione Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      success_url: success_url ?? `${req.headers.get('origin')}/`,
      cancel_url: cancel_url ?? `${req.headers.get('origin')}/`,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      ...(resolvedPromoId
        ? { discounts: [{ promotion_code: resolvedPromoId }], payment_method_collection: 'if_required' }
        : { allow_promotion_codes: true }
      ),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
