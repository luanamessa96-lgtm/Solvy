import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type EmailType = 'welcome' | 'upgrade_pro' | 'refund' | 'cancellation';
type Lang = 'it' | 'es';

interface EmailPayload {
  type: EmailType;
  email: string;
  name: string;
  lang: Lang;
  amount?: string; // es. "7.99" — usato per l'email di rimborso
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Soggetti ────────────────────────────────────────────────────────────────

const SUBJECTS: Record<EmailType, Record<Lang, string>> = {
  welcome: {
    it: 'Benvenuto su Solvy! 👋',
    es: '¡Bienvenido a Solvy! 👋',
  },
  upgrade_pro: {
    it: 'Il tuo piano Pro è attivo 🚀',
    es: 'Tu plan Pro está activo 🚀',
  },
  refund: {
    it: 'Il tuo rimborso è in elaborazione',
    es: 'Tu reembolso está siendo procesado',
  },
  cancellation: {
    it: 'Il tuo abbonamento Solvy è stato cancellato',
    es: 'Tu suscripción de Solvy ha sido cancelada',
  },
};

// ─── Wrapper HTML email ───────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr>
          <td style="background-color:#3b82f6;border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <span style="display:inline-block;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1;">Solvy</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background-color:#ffffff;padding:40px 40px 36px;border-radius:0 0 16px 16px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 0 0;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">
              <a href="https://solvyapp.com" style="color:#3b82f6;text-decoration:none;font-weight:600;">solvyapp.com</a>
              &nbsp;·&nbsp;
              <a href="mailto:hello@solvyapp.com" style="color:#3b82f6;text-decoration:none;font-weight:600;">hello@solvyapp.com</a>
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.5;">
              © 2026 Solvy — Luana Messa, Madrid (España)<br />
              <a href="https://solvyapp.com/privacy" style="color:#94a3b8;text-decoration:none;">Privacy Policy</a>
              &nbsp;·&nbsp;
              <a href="https://solvyapp.com/terms" style="color:#94a3b8;text-decoration:none;">Termini di Servizio</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Helpers stile ────────────────────────────────────────────────────────────

const h1 = (text: string) =>
  `<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1e293b;letter-spacing:-0.3px;line-height:1.3;">${text}</h1>`;

const p = (text: string) =>
  `<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.65;">${text}</p>`;

const ctaButton = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:10px;background-color:#3b82f6;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">${label}</a>
      </td>
    </tr>
  </table>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />`;

const badge = (text: string) =>
  `<span style="display:inline-block;background-color:#eff6ff;color:#3b82f6;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;border:1px solid #bfdbfe;letter-spacing:0.3px;">${text}</span>`;

const featureRow = (icon: string, title: string, desc: string) =>
  `<tr>
    <td style="padding:10px 0;vertical-align:top;width:32px;font-size:18px;">${icon}</td>
    <td style="padding:10px 0 10px 12px;vertical-align:top;">
      <strong style="display:block;font-size:14px;color:#1e293b;margin-bottom:2px;">${title}</strong>
      <span style="font-size:13px;color:#64748b;">${desc}</span>
    </td>
  </tr>`;

// ─── Template: welcome ────────────────────────────────────────────────────────

function templateWelcome(name: string, lang: Lang): string {
  if (lang === 'es') {
    return emailWrapper(`
      ${badge('¡Bienvenido!')}
      <div style="margin-top:20px;">
        ${h1(`Hola ${name}, ya formas parte de Solvy 👋`)}
        ${p('Solvy es tu app de gestión financiera para autónomos — controla tus ingresos, gastos y obligaciones fiscales desde un solo lugar.')}
        ${ctaButton('https://solvyapp.com', 'Abrir Solvy')}
        ${divider()}
        <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">¿Qué puedes hacer ahora?</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${featureRow('📄', 'Crea tu primera factura', 'Emite facturas en segundos con todos los datos fiscales.')}
          ${featureRow('💸', 'Registra tus gastos', 'Sube recibos y clasifica tus gastos deducibles.')}
          ${featureRow('📅', 'Controla tus obligaciones', 'El calendario fiscal te recuerda IVA, IRPF y cuotas RETA.')}
        </table>
        ${divider()}
        ${p('¿Tienes dudas? Escríbenos a <a href="mailto:hello@solvyapp.com" style="color:#3b82f6;text-decoration:none;">hello@solvyapp.com</a> — estamos aquí para ayudarte.')}
      </div>
    `);
  }

  return emailWrapper(`
    ${badge('Benvenuto!')}
    <div style="margin-top:20px;">
      ${h1(`Ciao ${name}, sei su Solvy! 👋`)}
      ${p('Solvy è la tua app di gestione finanziaria per freelancer — tieni sotto controllo fatture, spese e scadenze fiscali tutto in un posto.')}
      ${ctaButton('https://solvyapp.com', 'Apri Solvy')}
      ${divider()}
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Cosa puoi fare adesso</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${featureRow('📄', 'Crea la tua prima fattura', 'Emetti fatture in pochi secondi con tutti i dati fiscali.')}
        ${featureRow('💸', 'Registra le tue spese', 'Carica scontrini e classifica le spese deducibili.')}
        ${featureRow('📅', 'Tieni d\'occhio le scadenze', 'Il calendario fiscale ti ricorda F24, IVA, INPS e molto altro.')}
      </table>
      ${divider()}
      ${p('Hai domande? Scrivici a <a href="mailto:hello@solvyapp.com" style="color:#3b82f6;text-decoration:none;">hello@solvyapp.com</a> — siamo qui per aiutarti.')}
    </div>
  `);
}

// ─── Template: upgrade_pro ────────────────────────────────────────────────────

function templateUpgradePro(name: string, lang: Lang): string {
  if (lang === 'es') {
    return emailWrapper(`
      ${badge('Plan Pro activo')}
      <div style="margin-top:20px;">
        ${h1(`${name}, tu plan Pro está activo 🚀`)}
        ${p('Gracias por suscribirte a Solvy Pro. Ahora tienes acceso a todas las funciones avanzadas.')}
        ${ctaButton('https://solvyapp.com', 'Ir a Solvy Pro')}
        ${divider()}
        <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Lo que incluye tu plan Pro</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${featureRow('👥', 'Perfiles múltiples ilimitados', 'Gestiona varias actividades desde una sola cuenta.')}
          ${featureRow('📊', 'Dashboard fiscal avanzado', 'Proyecciones, comparativas anuales y análisis detallados.')}
          ${featureRow('📤', 'Exportación para el gestor', 'Genera informes completos listos para tu gestoría.')}
          ${featureRow('🎨', 'Temas Pro exclusivos', 'Pro Light y Pro Dark disponibles en Ajustes.')}
          ${featureRow('🔔', 'Recordatorios automáticos', 'Alertas de pago y vencimientos fiscales.')}
        </table>
        ${divider()}
        <p style="margin:0;font-size:13px;color:#94a3b8;">Derecho de desistimiento: si no estás satisfecho/a, puedes solicitar un reembolso completo dentro de los 14 días desde la contratación desde Ajustes → Gestión de suscripción.</p>
      </div>
    `);
  }

  return emailWrapper(`
    ${badge('Piano Pro attivo')}
    <div style="margin-top:20px;">
      ${h1(`${name}, il tuo piano Pro è attivo 🚀`)}
      ${p('Grazie per esserti iscritto a Solvy Pro. Hai ora accesso a tutte le funzionalità avanzate.')}
      ${ctaButton('https://solvyapp.com', 'Vai a Solvy Pro')}
      ${divider()}
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.8px;">Cosa include il tuo piano Pro</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${featureRow('👥', 'Profili multipli illimitati', 'Gestisci più attività da un unico account.')}
        ${featureRow('📊', 'Dashboard tasse avanzata', 'Proiezioni, comparativi annuali e analisi dettagliate.')}
        ${featureRow('📤', 'Export completo per il commercialista', 'Genera report pronti per la tua contabilità.')}
        ${featureRow('🎨', 'Temi Pro esclusivi', 'Pro Light e Pro Dark disponibili nelle Impostazioni.')}
        ${featureRow('🔔', 'Promemoria automatici', 'Avvisi di pagamento e scadenze fiscali.')}
      </table>
      ${divider()}
      <p style="margin:0;font-size:13px;color:#94a3b8;">Diritto di recesso: se non sei soddisfatto, puoi richiedere un rimborso completo entro 14 giorni dall'acquisto da Impostazioni → Gestione abbonamento.</p>
    </div>
  `);
}

// ─── Template: refund ────────────────────────────────────────────────────────

function templateRefund(name: string, lang: Lang, amount?: string): string {
  const amountStr = amount ? `€${amount}` : 'l\'importo pagato';

  if (lang === 'es') {
    return emailWrapper(`
      ${badge('Reembolso procesado')}
      <div style="margin-top:20px;">
        ${h1(`${name}, tu reembolso está en camino`)}
        ${p(`Hemos procesado tu solicitud de reembolso por ${amountStr}. El importe aparecerá en tu cuenta en <strong>5–10 días hábiles</strong>, dependiendo de tu banco.`)}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border-radius:10px;margin:20px 0;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Resumen del reembolso</p>
            <p style="margin:0 0 4px;font-size:15px;color:#1e293b;"><strong>Importe:</strong> ${amountStr}</p>
            <p style="margin:0 0 4px;font-size:15px;color:#1e293b;"><strong>Estado:</strong> En proceso</p>
            <p style="margin:0;font-size:15px;color:#1e293b;"><strong>Plan:</strong> Revertido a Free</p>
          </td></tr>
        </table>
        ${p('Tu cuenta ha sido revertida al plan gratuito. Puedes seguir usando Solvy Free sin interrupciones.')}
        ${ctaButton('https://solvyapp.com', 'Abrir Solvy')}
        ${divider()}
        ${p('¿Tienes alguna pregunta sobre el reembolso? Escríbenos a <a href="mailto:hello@solvyapp.com" style="color:#3b82f6;text-decoration:none;">hello@solvyapp.com</a>.')}
      </div>
    `);
  }

  return emailWrapper(`
    ${badge('Rimborso in elaborazione')}
    <div style="margin-top:20px;">
      ${h1(`${name}, il tuo rimborso è in arrivo`)}
      ${p(`Abbiamo elaborato la tua richiesta di rimborso per ${amountStr}. L'importo apparirà sul tuo conto entro <strong>5–10 giorni lavorativi</strong>, a seconda della tua banca.`)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border-radius:10px;margin:20px 0;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Riepilogo rimborso</p>
          <p style="margin:0 0 4px;font-size:15px;color:#1e293b;"><strong>Importo:</strong> ${amountStr}</p>
          <p style="margin:0 0 4px;font-size:15px;color:#1e293b;"><strong>Stato:</strong> In elaborazione</p>
          <p style="margin:0;font-size:15px;color:#1e293b;"><strong>Piano:</strong> Ripristinato a Free</p>
        </td></tr>
      </table>
      ${p('Il tuo account è stato ripristinato al piano gratuito. Puoi continuare a usare Solvy Free senza interruzioni.')}
      ${ctaButton('https://solvyapp.com', 'Apri Solvy')}
      ${divider()}
      ${p('Hai domande sul rimborso? Scrivici a <a href="mailto:hello@solvyapp.com" style="color:#3b82f6;text-decoration:none;">hello@solvyapp.com</a>.')}
    </div>
  `);
}

// ─── Template: cancellation ───────────────────────────────────────────────────

function templateCancellation(name: string, lang: Lang): string {
  if (lang === 'es') {
    return emailWrapper(`
      ${badge('Suscripción cancelada')}
      <div style="margin-top:20px;">
        ${h1(`${name}, tu suscripción ha sido cancelada`)}
        ${p('Hemos cancelado tu suscripción a Solvy Pro. Tu cuenta ha vuelto al plan gratuito.')}
        ${p('Tus datos (facturas, gastos, documentos) están a salvo y seguirán accesibles con el plan Free.')}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:10px;margin:20px 0;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.5;">Con el plan Free puedes seguir gestionando <strong>facturas y gastos ilimitados</strong>, tu perfil fiscal y el calendario de vencimientos.</p>
          </td></tr>
        </table>
        ${ctaButton('https://solvyapp.com', 'Abrir Solvy')}
        ${divider()}
        ${p('¿Cambiaste de opinión? Puedes volver a Pro en cualquier momento desde Ajustes → Actualizar a Pro.')}
        ${p('¿Tienes algún comentario sobre por qué cancelaste? Nos ayudaría mucho saberlo: <a href="mailto:hello@solvyapp.com" style="color:#3b82f6;text-decoration:none;">hello@solvyapp.com</a>.')}
      </div>
    `);
  }

  return emailWrapper(`
    ${badge('Abbonamento cancellato')}
    <div style="margin-top:20px;">
      ${h1(`${name}, il tuo abbonamento è stato cancellato`)}
      ${p('Abbiamo cancellato il tuo abbonamento a Solvy Pro. Il tuo account è tornato al piano gratuito.')}
      ${p('I tuoi dati (fatture, spese, documenti) sono al sicuro e resteranno accessibili con il piano Free.')}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:10px;margin:20px 0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.5;">Con il piano Free puoi continuare a gestire <strong>fatture e spese illimitate</strong>, il tuo profilo fiscale e il calendario delle scadenze.</p>
        </td></tr>
      </table>
      ${ctaButton('https://solvyapp.com', 'Apri Solvy')}
      ${divider()}
      ${p('Hai cambiato idea? Puoi tornare a Pro in qualsiasi momento da Impostazioni → Passa a Pro.')}
      ${p('Hai feedback su perché hai cancellato? Ci aiuteresti molto saperlo: <a href="mailto:hello@solvyapp.com" style="color:#3b82f6;text-decoration:none;">hello@solvyapp.com</a>.')}
    </div>
  `);
}

// ─── Router template ──────────────────────────────────────────────────────────

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  const { type, name, lang, amount } = payload;
  const subject = SUBJECTS[type][lang].replace('{{name}}', name);

  let html: string;
  switch (type) {
    case 'welcome':      html = templateWelcome(name, lang); break;
    case 'upgrade_pro':  html = templateUpgradePro(name, lang); break;
    case 'refund':       html = templateRefund(name, lang, amount); break;
    case 'cancellation': html = templateCancellation(name, lang); break;
    default:             throw new Error(`Tipo email non supportato: ${type}`);
  }

  return { subject, html };
}

// ─── Handler principale ───────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Accetta sia JWT utente che service role key (per chiamate inter-function)
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isServiceRole) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
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

    const payload = await req.json() as EmailPayload;

    if (!payload.type || !payload.email || !payload.name || !payload.lang) {
      return new Response(JSON.stringify({ error: 'Missing required fields: type, email, name, lang' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.type === 'welcome') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      await fetch(`${supabaseUrl}/functions/v1/telegram-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ type: 'new_user', email: payload.email, name: payload.name, country: payload.lang === 'es' ? 'Spain' : 'Italy' }),
      }).catch(e => console.error('telegram-alert (new_user) failed:', e));

      // Loops signup sync — fire-and-forget
      fetch(`${supabaseUrl}/functions/v1/loops-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          action: 'signup',
          email: payload.email,
          name: payload.name,
          paese: payload.lang === 'es' ? 'Spain' : 'Italy',
        }),
      }).catch(e => console.error('loops-sync (signup) failed:', e));
    }

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
