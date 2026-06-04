import { createClient } from 'npm:@supabase/supabase-js@2'
import { checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Lang = 'en' | 'pt' | 'es' | 'fr' | 'zh'

const DEFAULT_RESET_URL = 'https://app.mundustrade.us/reset-password'
const ALLOWED_APP_HOSTS = new Set(['app.mundustrade.us', 'app.mundustrade.com'])

function safeResetRedirect(value?: string) {
  if (!value) return DEFAULT_RESET_URL
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && ALLOWED_APP_HOSTS.has(url.hostname) && url.pathname === '/reset-password') {
      return url.toString()
    }
  } catch { /* ignore invalid URL */ }
  return DEFAULT_RESET_URL
}

const T: Record<Lang, {
  subject: string
  preheader: string
  greeting: string
  body: string
  cta: string
  expires: string
  ignore: string
  signoff: string
}> = {
  en: {
    subject: 'Reset your Mundus Trade password',
    preheader: 'Use the link below to choose a new password.',
    greeting: 'Hi there,',
    body: 'We received a request to reset the password for your Mundus Trade account. Click the button below to choose a new password.',
    cta: 'Reset password',
    expires: 'This link expires in 1 hour.',
    ignore: "If you didn't request this, you can safely ignore this email — your password won't change.",
    signoff: 'The Mundus Trade Team',
  },
  pt: {
    subject: 'Redefina sua senha da Mundus Trade',
    preheader: 'Use o link abaixo para escolher uma nova senha.',
    greeting: 'Olá,',
    body: 'Recebemos um pedido para redefinir a senha da sua conta Mundus Trade. Clique no botão abaixo para escolher uma nova senha.',
    cta: 'Redefinir senha',
    expires: 'Este link expira em 1 hora.',
    ignore: 'Se você não solicitou isso, pode ignorar este e-mail — sua senha não será alterada.',
    signoff: 'Equipe Mundus Trade',
  },
  es: {
    subject: 'Restablece tu contraseña de Mundus Trade',
    preheader: 'Usa el enlace de abajo para elegir una nueva contraseña.',
    greeting: 'Hola,',
    body: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta Mundus Trade. Haz clic en el botón para elegir una nueva contraseña.',
    cta: 'Restablecer contraseña',
    expires: 'Este enlace expira en 1 hora.',
    ignore: 'Si no solicitaste esto, puedes ignorar este correo — tu contraseña no cambiará.',
    signoff: 'El equipo de Mundus Trade',
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe Mundus Trade',
    preheader: 'Utilisez le lien ci-dessous pour choisir un nouveau mot de passe.',
    greeting: 'Bonjour,',
    body: 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Mundus Trade. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.',
    cta: 'Réinitialiser le mot de passe',
    expires: 'Ce lien expire dans 1 heure.',
    ignore: "Si vous n'avez pas demandé cela, vous pouvez ignorer cet e-mail — votre mot de passe ne changera pas.",
    signoff: "L'équipe Mundus Trade",
  },
  zh: {
    subject: '重置您的 Mundus Trade 密码',
    preheader: '使用下面的链接选择新密码。',
    greeting: '您好，',
    body: '我们收到重置您 Mundus Trade 账号密码的请求。点击下方按钮选择新密码。',
    cta: '重置密码',
    expires: '此链接将在 1 小时后失效。',
    ignore: '如果您没有请求此操作，可以忽略此邮件 — 您的密码不会被更改。',
    signoff: 'Mundus Trade 团队',
  },
}

function renderHtml(lang: Lang, link: string) {
  const t = T[lang] ?? T.en
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"/><title>${t.subject}</title></head>
<body style="margin:0;background:#f5f3ee;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a;">
  <div style="display:none;max-height:0;overflow:hidden;">${t.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <img src="https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png" alt="Mundus Trade" width="200" style="display:inline-block;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
        </td></tr>
        <tr><td style="padding:24px 40px 8px;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0d0d0d;">${t.greeting}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3a3a3a;">${t.body}</p>
          <p style="margin:0 0 32px;text-align:center;">
            <a href="${link}" style="display:inline-block;background:#B64769;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">${t.cta}</a>
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  let body: { email?: string; redirectTo?: string; language?: string } = {}
  try { body = await req.json() } catch { /* allow empty */ }

  const emailRaw = (body.email ?? '').trim().toLowerCase()
  const redirectTo = safeResetRedirect(body.redirectTo)
  const lang = (['en','pt','es','fr','zh'].includes(body.language ?? '') ? body.language : 'en') as Lang

  // Never reveal whether the email exists — always 200.
  const ok = () => new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (!emailRaw || !emailRaw.includes('@')) return ok()

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Rate limit: 3 / 5 min per (IP + email) to block brute reset spam
  const ip = getClientIp(req)
  const rl = await checkRateLimit(admin, {
    key: `password-reset:${ip}:${emailRaw}`,
    windowSeconds: 300,
    max: 3,
  })
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders)

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: emailRaw,
      options: { redirectTo },
    })
    if (error || !data?.properties?.action_link) {
      console.warn('[send-password-reset] generateLink', error?.message)
      return ok()
    }

    const link = data.properties.action_link
    const html = renderHtml(lang, link)
    const subject = (T[lang] ?? T.en).subject

    let emailSent = false
    let emailError: string | null = null
    let resendId: string | null = null

    if (RESEND_API_KEY) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Mundus Trade <contact@mundustrade.com>',
          to: [emailRaw],
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
        console.warn('[send-password-reset]', emailError)
      }
    } else {
      emailError = 'missing_resend_credentials'
    }

    // Log into email_queue for Admin → Email Activity visibility.
    try {
      await admin.from('email_queue').insert({
        to_email: emailRaw,
        subject,
        html_body: html,
        template_name: 'passwordReset',
        template_vars: { language: lang, redirectTo },
        status: emailSent ? 'sent' : 'failed',
        sent_at: emailSent ? new Date().toISOString() : null,
        error_message: emailError,
        resend_id: resendId,
      })
    } catch (e) {
      console.warn('[send-password-reset] email_queue log failed', e)
    }
  } catch (e) {
    console.error('[send-password-reset] error', e)
  }

  return ok()
})