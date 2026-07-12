import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

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

    const token = authHeader.replace('Bearer ', '');

    // Verifica firma JWT con 2 ore di tolleranza sull'expiry.
    // verify_jwt=false nel config.toml permette al gateway di passare token scaduti —
    // la firma viene comunque verificata qui per sicurezza.
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
    if (!jwtSecret) throw new Error('SUPABASE_JWT_SECRET non configurato');

    let userId: string;
    try {
      const { payload } = await jose.jwtVerify(
        token,
        new TextEncoder().encode(jwtSecret),
        { clockTolerance: 7200 } // 2 ore di tolleranza
      );
      userId = payload.sub as string;
      if (!userId) throw new Error('sub mancante nel JWT');
    } catch (jwtErr) {
      console.error('JWT verification failed:', jwtErr);
      return new Response(JSON.stringify({ error: 'Token non valido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client admin con service role — bypassa RLS per cancellare tutto
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verifica che l'utente esista nel DB auth
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utente non trovato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Controlla se il body contiene un profileId (cancellazione singolo profilo)
    let profileIdOnly: string | undefined;
    try {
      const body = await req.json();
      if (body.profileId) profileIdOnly = body.profileId as string;
    } catch { /* body vuoto o non JSON — cancellazione account completo */ }

    if (profileIdOnly) {
      // Cancellazione singolo profilo: verifica che appartenga all'utente autenticato
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', profileIdOnly)
        .eq('user_id', userId)
        .single();

      if (!profileData) {
        return new Response(JSON.stringify({ error: 'Profilo non trovato o non autorizzato.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Cancella solo i dati di questo profilo (non tocca auth user né altri profili)
      const [docsRes, deadlinesRes, accountantRes] = await Promise.all([
        supabaseAdmin.from('documents').delete().eq('profile_id', profileIdOnly),
        supabaseAdmin.from('deadlines').delete().eq('profile_id', profileIdOnly),
        supabaseAdmin.from('accountant').delete().eq('profile_id', profileIdOnly),
      ]);
      if (docsRes.error) throw new Error(`Errore eliminazione documenti: ${docsRes.error.message}`);
      if (deadlinesRes.error) throw new Error(`Errore eliminazione scadenze: ${deadlinesRes.error.message}`);
      if (accountantRes.error) throw new Error(`Errore eliminazione dati commercialista: ${accountantRes.error.message}`);

      const profileRes = await supabaseAdmin.from('profiles').delete().eq('id', profileIdOnly).eq('user_id', userId);
      if (profileRes.error) throw new Error(`Errore eliminazione profilo: ${profileRes.error.message}`);

      console.log(`Profile deleted: profile_id=${profileIdOnly} user_id=${userId}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      if (docsRes.error) throw new Error(`Errore eliminazione documenti: ${docsRes.error.message}`);
      if (deadlinesRes.error) throw new Error(`Errore eliminazione scadenze: ${deadlinesRes.error.message}`);
      if (accountantRes.error) throw new Error(`Errore eliminazione dati commercialista: ${accountantRes.error.message}`);
    }

    // 4. Cancella profili
    const profilesRes = await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
    if (profilesRes.error) throw new Error(`Errore eliminazione profili: ${profilesRes.error.message}`);

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
    const msg = err instanceof Error ? err.message : JSON.stringify(err) ?? 'Errore sconosciuto';
    console.error('delete-account error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
