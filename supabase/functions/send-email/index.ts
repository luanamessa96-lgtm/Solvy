import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WelcomePayload {
  type: 'welcome';
  email: string;
  name: string;
  lang: 'it' | 'es';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
    if (!isServiceRole) {
      const supabase = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = await req.json() as WelcomePayload;
    if (!payload.email || !payload.name || !payload.lang) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, name, lang' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const country = payload.lang === 'es' ? 'Spain' : 'Italy';

    await fetch(`${supabaseUrl}/functions/v1/telegram-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ type: 'new_user', email: payload.email, name: payload.name, country }),
    }).catch(e => console.error('telegram-alert failed:', e));

    await fetch(`${supabaseUrl}/functions/v1/loops-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ action: 'signup', email: payload.email, name: payload.name, paese: country }),
    }).catch(e => console.error('loops-sync failed:', e));

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
