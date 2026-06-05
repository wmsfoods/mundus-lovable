import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    const { token, password } = await req.json()
    if (!token || !password || String(password).length < 8) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Look up invite
    const { data: invite, error: invErr } = await admin
      .from('company_users')
      .select('id, company_id, full_name, email, role, language, accepted_at, expires_at, status')
      .eq('invite_token', token)
      .maybeSingle()
    if (invErr) throw invErr
    if (!invite || invite.status === 'inactive') {
      return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (invite.accepted_at) {
      return new Response(JSON.stringify({ error: 'already_accepted' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'expired' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const email = String(invite.email).toLowerCase()

    // Find or create the auth user with confirmed email (no confirmation email sent)
    let userId: string | null = null
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: invite.full_name },
    })
    if (createErr) {
      // If user already exists, fetch and update password
      const msg = String(createErr.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        // Find user by email
        let page = 1
        while (page < 20 && !userId) {
          const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 })
          if (listErr) throw listErr
          const found = list?.users?.find((u: any) => (u.email || '').toLowerCase() === email)
          if (found) { userId = found.id; break }
          if (!list?.users?.length || list.users.length < 200) break
          page += 1
        }
        if (!userId) {
          return new Response(JSON.stringify({ error: 'user_lookup_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        // Update password + confirm email
        const { error: upErr } = await admin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { full_name: invite.full_name },
        })
        if (upErr) throw upErr
      } else {
        throw createErr
      }
    } else {
      userId = created?.user?.id ?? null
    }
    if (!userId) throw new Error('no_user_id')

    // Link company_users + create public.users row via RPC
    const { error: acceptErr } = await admin.rpc('accept_team_invitation', { p_token: token, p_user_id: userId })
    if (acceptErr) throw acceptErr

    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('accept-team-invite error', e)
    return new Response(JSON.stringify({ error: 'internal_error', message: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})