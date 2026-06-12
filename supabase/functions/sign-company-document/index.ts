import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthenticated' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: 'misconfigured' }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (!user) return json({ error: 'unauthenticated' }, 401);

  let body: { doc_id?: string; download?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'invalid_body' }, 400); }
  const docId = body?.doc_id;
  if (!docId) return json({ error: 'missing_doc_id' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load doc
  const { data: doc, error: dErr } = await admin
    .from('company_documents')
    .select('id, company_id, file_path, is_published, title, file_type')
    .eq('id', docId)
    .maybeSingle();
  if (dErr || !doc) return json({ error: 'not_found' }, 404);
  if (!doc.file_path) return json({ error: 'no_file' }, 404);

  // Authorization — admin check must run with the caller's JWT (auth.uid() is required)
  const { data: isAdminRow } = await userClient.rpc('is_mundus_admin');
  const isAdmin = isAdminRow === true;

  let isOwnerMember = false;
  if (!isAdmin) {
    const { data: members } = await admin
      .from('company_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('company_id', doc.company_id)
      .limit(1);
    isOwnerMember = !!members && members.length > 0;
  }

  const allowed = isAdmin || isOwnerMember || doc.is_published === true;
  if (!allowed) return json({ error: 'forbidden' }, 403);

  const { data: signed, error: sErr } = await admin.storage
    .from('company-documents')
    .createSignedUrl(doc.file_path, 60, body?.download ? { download: doc.title || 'document' } : undefined);
  if (sErr || !signed) return json({ error: 'sign_failed', message: sErr?.message }, 500);

  return json({ url: signed.signedUrl, expires_in: 60, file_type: doc.file_type ?? null, title: doc.title ?? null });
});