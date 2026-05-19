import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface RequestBody { negotiation_id: string; }

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });

const errorResponse = (code: string, message: string, status: number): Response =>
  json({ error: code, message }, status);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }
  if (req.method !== 'POST') return errorResponse('method_not_allowed', 'Use POST', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('unauthenticated', 'Missing Authorization Bearer token', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return errorResponse('misconfigured', 'Missing Supabase env vars', 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin: SupabaseClient = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return errorResponse('unauthenticated', 'Invalid token', 401);

  let body: RequestBody;
  try { body = (await req.json()) as RequestBody; }
  catch { return errorResponse('invalid_json', 'Body must be valid JSON', 400); }
  if (typeof body.negotiation_id !== 'string') {
    return errorResponse('invalid_payload', 'Expected { negotiation_id: uuid }', 400);
  }

  const { data: neg, error: negErr } = await admin
    .from('negotiations').select('buyer_company_id').eq('id', body.negotiation_id)
    .maybeSingle<{ buyer_company_id: string }>();
  if (negErr) return errorResponse('db_error', negErr.message, 500);
  if (!neg) return errorResponse('negotiation_not_found', 'Negotiation does not exist', 404);

  const { data: membership, error: memErr } = await admin
    .from('users').select('company_id').eq('id', user.id)
    .maybeSingle<{ company_id: string }>();
  if (memErr) return errorResponse('db_error', memErr.message, 500);
  if (!membership || membership.company_id !== neg.buyer_company_id) {
    return errorResponse('forbidden', 'User does not belong to the buyer company', 403);
  }

  const { data: rpcResult, error: rpcErr } = await admin.rpc('accept_negotiation', {
    p_negotiation_id: body.negotiation_id,
    p_user_id: user.id,
  });

  if (rpcErr) {
    const msg = rpcErr.message;
    if (msg.includes('negotiation_not_found')) return errorResponse('negotiation_not_found', msg, 404);
    if (msg.includes('invalid_status')) return errorResponse('invalid_status', msg, 409);
    if (msg.includes('no_rounds_to_accept')) return errorResponse('no_rounds_to_accept', msg, 409);
    if (msg.includes('no_counter_to_accept')) return errorResponse('no_counter_to_accept', msg, 409);
    return errorResponse('rpc_error', msg, 500);
  }

  return json({ success: true, ...rpcResult });
});
