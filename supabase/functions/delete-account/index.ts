import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Verifica utente tramite JWT
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

    const userId = user.id;

    // Client admin con service role — bypassa RLS per cancellare tutto
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Recupera tutti i profili per trovare stripe_customer_id e profile IDs
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('user_id', userId);

    const profileIds = (profiles ?? []).map((p) => p.id as string);
    const stripeCustomerIds = [
      ...new Set(
        (profiles ?? [])
          .map((p) => p.stripe_customer_id as string | null)
          .filter(Boolean) as string[]
      ),
    ];

    // 2. Cancella abbonamenti Stripe attivi e il customer (best-effort, non blocca se fallisce)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (stripeKey && stripeCustomerIds.length > 0) {
      const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
      for (const customerId of stripeCustomerIds) {
        try {
          // Cancella subscriptions attive e in prova
          for (const status of ['active', 'trialing', 'past_due'] as const) {
            const { data: subs } = await stripe.subscriptions.list({ customer: customerId, status });
            for (const sub of subs) {
              await stripe.subscriptions.cancel(sub.id);
            }
          }
          // Elimina il customer da Stripe
          await stripe.customers.del(customerId);
        } catch (stripeErr) {
          console.error('Stripe cleanup error for customer', customerId, stripeErr);
          // Non blocchiamo la cancellazione dell'account se Stripe fallisce
        }
      }
    }

    // 3. Cancella dati utente in ordine (figli prima dei genitori)
    if (profileIds.length > 0) {
      const [docsRes, deadlinesRes, accountantRes] = await Promise.all([
        supabaseAdmin.from('documents').delete().in('profile_id', profileIds),
        supabaseAdmin.from('deadlines').delete().in('profile_id', profileIds),
        supabaseAdmin.from('accountant').delete().in('profile_id', profileIds),
      ]);
      if (docsRes.error) console.error('Error deleting documents:', docsRes.error);
      if (deadlinesRes.error) console.error('Error deleting deadlines:', deadlinesRes.error);
      if (accountantRes.error) console.error('Error deleting accountant:', accountantRes.error);
    }

    // 4. Cancella profili
    const profilesRes = await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
    if (profilesRes.error) console.error('Error deleting profiles:', profilesRes.error);

    // 5. Cancella utente da Supabase Auth (deve essere l'ultima operazione)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      throw new Error('Impossibile eliminare l\'account di autenticazione. Contatta il supporto.');
    }

    console.log(`Account deleted successfully: user_id=${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('delete-account error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
