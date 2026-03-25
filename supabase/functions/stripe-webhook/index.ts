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
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        // Attiva Pro su tutti i profili dell'utente
        await supabaseAdmin
          .from('profiles')
          .update({ is_pro: true })
          .eq('user_id', userId);

        console.log(`Pro attivato per user_id: ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        // Rinnovo subscription — mantieni is_pro = true
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
            .update({ is_pro: true })
            .eq('user_id', profiles[0].user_id);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        // Subscription cancellata o pagamento fallito → revoca Pro
        const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
        const customerId = (obj as Stripe.Subscription).customer as string
          ?? (obj as Stripe.Invoice).customer as string;

        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .limit(1);

        if (profiles?.[0]?.user_id) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_pro: false })
            .eq('user_id', profiles[0].user_id);

          console.log(`Pro revocato per customer: ${customerId}`);
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
