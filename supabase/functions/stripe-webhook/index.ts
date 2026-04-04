import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

// Chiama la edge function send-email in modo fire-and-forget (non blocca il webhook)
async function sendEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: { type: string; email: string; name: string; lang: 'it' | 'es'; amount?: string }
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non blocca il webhook su errore email
    console.error('send-email call failed:', err);
  }
}

function langFromCountry(country: string | null | undefined): 'it' | 'es' {
  return country === 'Spain' ? 'es' : 'it';
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
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
        if (!userId) break;

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

        // Attiva Pro e salva data primo pagamento (solo al primo acquisto, non ai rinnovi)
        await supabaseAdmin
          .from('profiles')
          .update({
            is_pro: true,
            ...(subscriptionPlan ? { subscription_plan: subscriptionPlan } : {}),
            ...(isFirstSubscription ? { subscription_started_at: new Date().toISOString() } : {}),
          })
          .eq('user_id', userId);

        console.log(`Pro attivato per user_id: ${userId}, primo acquisto: ${isFirstSubscription}`);

        // Invia email upgrade_pro (fire-and-forget)
        if (existing?.[0]?.email) {
          sendEmail(supabaseUrl, serviceRoleKey, {
            type: 'upgrade_pro',
            email: existing[0].email,
            name: existing[0].name ?? 'utente',
            lang: langFromCountry(existing[0].country),
          });
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

          // Invia email cancellazione (fire-and-forget)
          if (profiles[0].email) {
            sendEmail(supabaseUrl, serviceRoleKey, {
              type: 'cancellation',
              email: profiles[0].email,
              name: profiles[0].name ?? 'utente',
              lang: langFromCountry(profiles[0].country),
            });
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
