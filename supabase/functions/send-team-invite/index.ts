import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Lang = 'en' | 'pt' | 'es' | 'fr' | 'zh'

const T: Record<Lang, {
  subject: (org: string) => string
  preheader: string
  greeting: (name: string) => string
  body: (org: string, role: string) => string
  cta: string
  expires: string
  ignore: string
  signoff: string
}> = {
  en: {
    subject: (o) => `You've been invited to join ${o} on Mundus Trade`,
    preheader: 'Accept your invitation and set your password.',
    greeting: (n) => `Hi ${n},`,
    body: (o, r) => `You've been invited to join <strong>${o}</strong> as <strong>${r}</strong> on the Mundus Trade platform. Click the button below to set your password and access your workspace.`,
    cta: 'Accept invitation',
    expires: 'This invitation expires in 7 days.',
    ignore: "If you didn't expect this, you can safely ignore this email.",
    signoff: 'The Mundus Trade Team',
  },
  pt: {
    subject: (o) => `Você foi convidado para ${o} na Mundus Trade`,
    preheader: 'Aceite seu convite e defina sua senha.',
    greeting: (n) => `Olá ${n},`,
    body: (o, r) => `Você foi convidado para fazer parte de <strong>${o}</strong> como <strong>${r}</strong> na plataforma Mundus Trade. Clique no botão abaixo para definir sua senha e acessar seu workspace.`,
    cta: 'Aceitar convite',
    expires: 'Este convite expira em 7 dias.',
    ignore: 'Se não está esperando este convite, pode ignorar este e-mail.',
    signoff: 'Equipe Mundus Trade',
  },
  es: {
    subject: (o) => `Has sido invitado a unirte a ${o} en Mundus Trade`,
    preheader: 'Acepta tu invitación y establece tu contraseña.',
    greeting: (n) => `Hola ${n},`,
    body: (o, r) => `Has sido invitado a unirte a <strong>${o}</strong> como <strong>${r}</strong> en la plataforma Mundus Trade. Haz clic en el botón para definir tu contraseña y acceder.`,
    cta: 'Aceptar invitación',
    expires: 'Esta invitación expira en 7 días.',
    ignore: 'Si no esperabas esto, puedes ignorar este correo.',
    signoff: 'El equipo de Mundus Trade',
  },
  fr: {
    subject: (o) => `Vous êtes invité à rejoindre ${o} sur Mundus Trade`,
    preheader: 'Acceptez votre invitation et définissez votre mot de passe.',
    greeting: (n) => `Bonjour ${n},`,
    body: (o, r) => `Vous êtes invité à rejoindre <strong>${o}</strong> en tant que <strong>${r}</strong> sur la plateforme Mundus Trade. Cliquez sur le bouton ci-dessous pour définir votre mot de passe.`,
    cta: "Accepter l'invitation",
    expires: 'Cette invitation expire dans 7 jours.',
    ignore: "Si vous n'attendiez pas cela, vous pouvez ignorer cet e-mail.",
    signoff: "L'équipe Mundus Trade",
  },
  zh: {
    subject: (o) => `您被邀请加入 Mundus Trade 上的 ${o}`,
    preheader: '接受邀请并设置您的密码。',
    greeting: (n) => `您好 ${n}，`,
    body: (o, r) => `您已被邀请加入 <strong>${o}</strong>，担任 <strong>${r}</strong>，使用 Mundus Trade 平台。请点击下方按钮设置密码并访问您的工作区。`,
    cta: '接受邀请',
    expires: '此邀请将在 7 天后失效。',
    ignore: '如果您并未预期此邀请，请忽略此邮件。',
    signoff: 'Mundus Trade 团队',
  },
}

function renderHtml(lang: Lang, opts: { name: string; org: string; role: string; link: string }) {
  const t = T[lang] ?? T.en
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"/><title>${t.subject(opts.org)}</title></head>
<body style="margin:0;background:#f5f3ee;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a;">
  <div style="display:none;max-height:0;overflow:hidden;">${t.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 40px 0;">
          <div style="font-size:14px;letter-spacing:0.12em;color:#8a1538;font-weight:700;">MUNDUS TRADE</div>
        </td></tr>
        <tr><td style="padding:24px 40px 8px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0d0d0d;">${t.greeting(opts.name)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a3a3a;">${t.body(opts.org, opts.role)}</p>
          <p style="margin:0 0 32px;text-align:center;">
            <a href="${opts.link}" style="display:inline-block;background:#8a1538;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">${t.cta}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#777;">${t.expires}</p>
          <p style="margin:0 0 24px;font-size:13px;color:#777;">${t.ignore}</p>
        </td></tr>
        <tr><td style="padding:0 40px 32px;border-top:1px solid #eee;">
          <p style="margin:24px 0 0;font-size:13px;color:#999;">${t.signoff}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const PROFILE_LABELS: Record<string, Partial<Record<Lang, string>>> = {
  master_buyer: { en: 'Master Buyer', pt: 'Comprador Master', es: 'Comprador Maestro', fr: 'Acheteur principal', zh: '主采购员' },
  procurement: { en: 'Procurement', pt: 'Compras', es: 'Compras', fr: 'Approvisionnement', zh: '采购' },
  import_manager: { en: 'Import Manager', pt: 'Gerente de Importação', es: 'Gerente de Importación', fr: 'Responsable des imports', zh: '进口经理' },
  quality_control: { en: 'Quality Control', pt: 'Controle de Qualidade', es: 'Control de Calidad', fr: 'Contrôle qualité', zh: '质量控制' },
  logistics: { en: 'Logistics', pt: 'Logística', es: 'Logística', fr: 'Logistique', zh: '物流' },
  master_supplier: { en: 'Master Supplier', pt: 'Fornecedor Master', es: 'Proveedor Maestro', fr: 'Fournisseur principal', zh: '主供应商' },
  operator: { en: 'Operator', pt: 'Operador', es: 'Operador', fr: 'Opérateur', zh: '操作员' },
  export_manager: { en: 'Export Manager', pt: 'Gerente de Exportação', es: 'Gerente de Exportación', fr: 'Responsable export', zh: '出口经理' },
}

function profileLabel(role: string, lang: Lang) {
  return PROFILE_LABELS[role]?.[lang] ?? PROFILE_LABELS[role]?.en ?? role
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const RESEND_API_KEY = Deno.env.get('resend_mundus')

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    const callerId = claims?.claims?.sub
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const {
      company_id, full_name, email, role, job_title, phone, notes,
      language = 'en', origin,
    } = body ?? {}

    if (!company_id || !full_name || !email || !role) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Authorize: caller must be master of company OR mundus admin
    const { data: canManage } = await admin.rpc('is_company_master', { _company_id: company_id })
    const { data: isAdmin } = await admin.rpc('is_mundus_admin')
    // Note: is_company_master / is_mundus_admin use auth.uid() — we need to call them as the user.
    const { data: canManageAsUser } = await userClient.rpc('is_company_master', { _company_id: company_id })
    const { data: isAdminAsUser } = await userClient.rpc('is_mundus_admin')
    if (!canManageAsUser && !isAdminAsUser) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get company name
    const { data: companyRow } = await admin.from('companies').select('name').eq('id', company_id).maybeSingle()
    const orgName = companyRow?.name ?? 'your company'

    // Single source of truth: company_users
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: cu, error: cuErr } = await admin.from('company_users').upsert({
      company_id,
      full_name,
      email: email.toLowerCase(),
      role,
      job_title,
      phone,
      notes,
      status: 'invited',
      invited_at: new Date().toISOString(),
      invite_token: token,
      expires_at: expiresAt,
      language,
    }, { onConflict: 'company_id,email' }).select('id').single()
    if (cuErr) throw cuErr
    const inviteId = cu.id

    // Send email via Resend gateway
    const baseUrl = origin || 'https://app.mundustrade.us'
    const link = `${baseUrl}/invite/${token}`
    const lang = (['en','pt','es','fr','zh'].includes(language) ? language : 'en') as Lang
    const html = renderHtml(lang, { name: full_name, org: orgName, role: profileLabel(role, lang), link })
    const subject = (T[lang] ?? T.en).subject(orgName)

    let emailSent = false
    let emailError: string | null = null
    let resendId: string | null = null
    if (LOVABLE_API_KEY && RESEND_API_KEY) {
      const resp = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: 'Mundus Trade <noreply@mundustrade.us>',
          to: [email],
          subject,
          html,
        }),
      })
      if (resp.ok) {
        emailSent = true
        try {
          const j = await resp.json()
          resendId = j?.id ?? j?.data?.id ?? null
        } catch { /* ignore */ }
      } else {
        emailError = `resend_${resp.status}: ${await resp.text()}`
      }
    } else {
      emailError = 'missing_resend_credentials'
    }

    // Log a copy in email_queue so it shows up in Admin → Email Activity.
    try {
      await admin.from('email_queue').insert({
        to_email: email,
        subject,
        html_body: html,
        template_name: 'teamInvite',
        template_vars: { company_id, full_name, role, language, link },
        status: emailSent ? 'sent' : 'failed',
        sent_at: emailSent ? new Date().toISOString() : null,
        error_message: emailError,
        resend_id: resendId,
      })
    } catch (e) {
      console.warn('email_queue log failed', e)
    }

    return new Response(JSON.stringify({
      ok: true, invite_id: inviteId, token, link, email_sent: emailSent, email_error: emailError,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('send-team-invite error', e)
    return new Response(JSON.stringify({ error: 'internal_error', message: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})