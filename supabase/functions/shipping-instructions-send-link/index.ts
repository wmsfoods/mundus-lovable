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

    // Get order for offer_id + order_number for email
    const { data: order } = await supabase
      .from('orders')
      .select('offer_id, order_number, placed_at')
      .eq('id', order_id)
      .maybeSingle();

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

    // Send email via Resend (best effort)
    const RESEND_API_KEY = Deno.env.get('resend_mundus') || Deno.env.get('RESEND_API_KEY');
    let emailSent = false;
    if (RESEND_API_KEY) {
      try {
        const orderNumber = order?.order_number
          ? `M-${String(order.order_number).padStart(6, '0')}-${new Date(order.placed_at).getFullYear()}`
          : 'pending';
        const greetingName = (buyer_name && String(buyer_name).trim()) || 'Customer';
        const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #8B2252; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: .02em;">Mundus Trade</h1>
  </div>
  <div style="padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 15px; color: #2a1a20;">Dear ${escapeHtml(greetingName)},</p>
    <p style="font-size: 14px; color: #2a1a20; line-height: 1.55;">
      We need your shipping instructions to proceed with the shipment for
      <strong>Order ${escapeHtml(orderNumber)}</strong>.
    </p>
    <p style="font-size: 14px; color: #2a1a20;">Please click the button below to fill in your shipping details:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="background: #8B2252; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
        Submit Shipping Instructions →
      </a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">This link will expire in 30 days.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
      This email was sent by Mundus Trade on behalf of the supplier.<br/>
      If you have questions, please contact your supplier directly.
    </p>
  </div>
</div>`;
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Mundus Trade <noreply@mundustrade.com>',
            to: [buyer_email],
            subject: `Shipping Instructions Required — Order ${orderNumber}`,
            html,
          }),
        });
        emailSent = resp.ok;
        if (!resp.ok) {
          const txt = await resp.text();
          console.warn('Resend send failed', resp.status, txt);
        }
      } catch (err) {
        console.warn('Email send error:', String((err as Error)?.message ?? err));
      }
    } else {
      console.warn('RESEND_API_KEY (resend_mundus) not set, skipping email');
    }

    return new Response(JSON.stringify({ url, token: request.token, request_id: request.id, expires_at: request.expires_at, email_sent: emailSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}