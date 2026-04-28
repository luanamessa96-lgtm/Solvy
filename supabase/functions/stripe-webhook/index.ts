import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';


Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is empty — set it in Supabase Edge Function secrets');
      return new Response('Webhook secret not configured', { status: 500 });
    }
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`Webhook received: ${event.type} (id: ${event.id}, livemode: ${event.livemode})`);
  } catch (err) {
    console.error('Webhook signature verification failed — wrong STRIPE_WEBHOOK_SECRET?', (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        console.log(`checkout.session.completed — session_id: ${session.id}, customer: ${session.customer}, user_id metadata: ${userId ?? 'MISSING'}`);
        if (!userId) {
          console.error('user_id missing from session metadata — is_pro will NOT be updated');
          break;
        }

        // Controlla se subscription_started_at è già impostato (rinnovo vs primo acquisto)
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('subscription_started_at, name, email, country')
          .eq('user_id', userId)
          .limit(1);

        const isFirstSubscription = !existing?.[0]?.subscription_started_at;

        // Recupera il piano (monthly/yearly) dalla subscription Stripe
        let subscriptionPlan: 'monthly' | 'yearly' | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            const interval = sub.items.data[0]?.price?.recurring?.interval;
            subscriptionPlan = interval === 'year' ? 'yearly' : 'monthly';
          } catch (e) {
            console.error('Failed to retrieve subscription for plan:', e);
          }
        }

        // Attiva Pro, salva stripe_customer_id e data primo pagamento
        const { error: updateError, count } = await supabaseAdmin
          .from('profiles')
          .update({
            is_pro: true,
            stripe_customer_id: session.customer as string,
            ...(subscriptionPlan ? { subscription_plan: subscriptionPlan } : {}),
            ...(isFirstSubscription ? { subscription_started_at: new Date().toISOString() } : {}),
          })
          .eq('user_id', userId)
          .select('id', { count: 'exact', head: true });

        if (updateError) {
          console.error(`DB update failed for user_id ${userId}:`, updateError.message);
        } else {
          console.log(`Pro attivato per user_id: ${userId}, righe aggiornate: ${count}, primo acquisto: ${isFirstSubscription}`);
        }

        if (existing?.[0]?.email) {
          await fetch(`${supabaseUrl}/functions/v1/loops-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({ action: 'upgrade_pro', email: existing[0].email, paese: existing[0].country }),
          }).catch(e => console.error('loops-sync (upgrade_pro) failed:', e));

          await fetch(`${supabaseUrl}/functions/v1/telegram-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              type: 'new_pro',
              email: existing[0].email,
              name: existing[0].name ?? 'utente',
              country: existing[0].country,
              plan: session.metadata?.plan ?? 'monthly',
            }),
          }).catch(e => console.error('telegram-alert (new_pro) failed:', e));
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // Rinnovo subscription — mantieni is_pro = true e aggiorna piano
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        if (profiles?.[0]?.user_id) {
          // Recupera il piano dalla subscription
          let subscriptionPlan: 'monthly' | 'yearly' | null = null;
          if (invoice.subscription) {
            try {
              const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
              const interval = sub.items.data[0]?.price?.recurring?.interval;
              subscriptionPlan = interval === 'year' ? 'yearly' : 'monthly';
            } catch (e) {
              console.error('Failed to retrieve subscription for plan:', e);
            }
          }

          await supabaseAdmin
            .from('profiles')
            .update({
              is_pro: true,
              ...(subscriptionPlan ? { subscription_plan: subscriptionPlan } : {}),
            })
            .eq('user_id', profiles[0].user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription cancellata → revoca Pro + email cancellazione
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id, name, email, country')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        if (profiles?.[0]?.user_id) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_pro: false, subscription_started_at: null, subscription_plan: null })
            .eq('user_id', profiles[0].user_id);

          console.log(`Pro revocato per customer: ${customerId}`);

          if (profiles[0].email) {
            await fetch(`${supabaseUrl}/functions/v1/loops-sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({ action: 'cancellation', email: profiles[0].email, paese: profiles[0].country }),
            }).catch(e => console.error('loops-sync (cancellation) failed:', e));
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Pagamento fallito → revoca Pro (senza email cancellazione)
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        if (profiles?.[0]?.user_id) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_pro: false, subscription_started_at: null })
            .eq('user_id', profiles[0].user_id);

          console.log(`Pro revocato per pagamento fallito, customer: ${customerId}`);
        }
        break;
      }

      default:
        console.log(`Evento non gestito: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(`Handler Error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
