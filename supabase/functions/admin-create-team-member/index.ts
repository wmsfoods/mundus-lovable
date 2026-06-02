import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MUNDUS_COMPANY_ID = '00000000-0000-beef-0000-000000000001'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    const callerId = claims?.claims?.sub
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Verify caller is mundus admin
    const { data: isAdmin } = await admin.rpc('is_mundus_admin_for', { _user_id: callerId } as any)
      .then((r: any) => r, () => ({ data: null }))
    if (isAdmin !== true) {
      // Fallback: check company_users membership in Mundus with admin role name
      const { data: cu } = await admin
        .from('company_users')
        .select('id, roles:role_id ( name )')
        .eq('company_id', MUNDUS_COMPANY_ID)
        .eq('user_id', callerId)
        .eq('status', 'active')
        .maybeSingle()
      const roleName = (cu as any)?.roles?.name as string | undefined
      if (!roleName || !roleName.startsWith('mundus_')) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const body = await req.json()
    const { full_name, email, password, role_id } = body ?? {}
    if (!full_name || !email || !password || !role_id) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(full_name).trim()

    // 1) Check if auth user already exists
    let userId: string | null = null
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()
    if (existing?.id) {
      userId = existing.id
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: cleanName },
      })
      if (createErr) {
        return new Response(JSON.stringify({ error: 'create_user_failed', message: createErr.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = created.user?.id ?? null
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'no_user_id' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Upsert public.users (service role bypasses RLS)
    const { error: upsertErr } = await admin.from('users').upsert({
      id: userId,
      email: cleanEmail,
      name: cleanName,
      company_id: MUNDUS_COMPANY_ID,
      active_company_id: MUNDUS_COMPANY_ID,
      user_type: 'admin',
    } as any, { onConflict: 'id' })
    if (upsertErr) {
      return new Response(JSON.stringify({ error: 'users_upsert_failed', message: upsertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3) Insert company_users
    const { error: cuErr } = await admin.from('company_users').insert({
      company_id: MUNDUS_COMPANY_ID,
      user_id: userId,
      email: cleanEmail,
      full_name: cleanName,
      role_id,
      status: 'active',
      joined_at: new Date().toISOString(),
    } as any)
    if (cuErr) {
      return new Response(JSON.stringify({ error: 'company_users_insert_failed', message: cuErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('admin-create-team-member error', e)
    return new Response(JSON.stringify({ error: 'internal_error', message: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})