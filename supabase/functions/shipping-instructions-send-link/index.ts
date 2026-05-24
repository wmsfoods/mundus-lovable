import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { order_id, buyer_email, buyer_name, origin } = await req.json();
    if (!order_id || !buyer_email) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get auth user (optional - supplier id)
    const authHeader = req.headers.get('Authorization');
    let sent_by: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data } = await supabase.auth.getUser(token);
      sent_by = data.user?.id ?? null;
    }

    // Get order for offer_id
    const { data: order } = await supabase.from('orders').select('offer_id').eq('id', order_id).maybeSingle();

    // Reuse active (not expired, not submitted) request if any
    const { data: existing } = await supabase
      .from('shipping_instructions_requests')
      .select('id, token, expires_at, status')
      .eq('order_id', order_id)
      .neq('status', 'inactive')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let request = existing;
    if (!request || request.status === 'received' || new Date(request.expires_at) < new Date()) {
      const { data: created, error } = await supabase
        .from('shipping_instructions_requests')
        .insert({
          order_id,
          offer_id: order?.offer_id ?? null,
          buyer_email,
          buyer_name: buyer_name ?? null,
          status: 'link_sent',
          sent_at: new Date().toISOString(),
          sent_by,
        })
        .select('id, token, expires_at')
        .single();
      if (error) throw error;
      request = { ...created, status: 'link_sent' };
    } else {
      await supabase
        .from('shipping_instructions_requests')
        .update({ status: 'link_sent', sent_at: new Date().toISOString(), sent_by, buyer_email, buyer_name })
        .eq('id', request.id);
    }

    const base = origin || 'https://mundus-lovable.lovable.app';
    const url = `${base.replace(/\/$/, '')}/shipping-instructions/${request.token}`;

    return new Response(JSON.stringify({ url, token: request.token, request_id: request.id, expires_at: request.expires_at }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});