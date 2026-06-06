import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireUser } from "../_shared/auth.ts";
import { insertAppNotificationForCompany } from "../_shared/appNotificationInsert.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(auth.response.body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { shipping_instruction_id } = await req.json();
    if (!shipping_instruction_id) {
      return new Response(JSON.stringify({ error: 'missing_shipping_instruction_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: si } = await supabase
      .from('shipping_instructions')
      .select('*')
      .eq('id', shipping_instruction_id)
      .maybeSingle();
    if (!si) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: reqRow } = await supabase
      .from('shipping_instructions_requests')
      .select('id, buyer_email, buyer_name, order_id')
      .eq('id', si.request_id)
      .maybeSingle();

    const { data: order } = await supabase
      .from('orders')
      .select(`
        order_number, placed_at,
        offer:offers(supplier:companies!offers_supplier_id_fkey(id, name))
      `)
      .eq('id', si.order_id)
      .maybeSingle();
    const offer = Array.isArray(order?.offer) ? order!.offer[0] : order?.offer;
    const supplier = offer?.supplier && (Array.isArray(offer.supplier) ? offer.supplier[0] : offer.supplier);
    let supplierEmail: string | null = null;
    if (supplier?.id) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('company_id', supplier.id)
        .not('email', 'is', null)
        .limit(1)
        .maybeSingle();
      supplierEmail = user?.email ?? null;
    }
    const orderNumber = order?.order_number
      ? `M-${String(order.order_number).padStart(6, '0')}-${new Date(order.placed_at).getFullYear()}`
      : (si.order_number || 'pending');

    const RESEND_API_KEY = Deno.env.get('resend_mundus') || Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'email_not_configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const docsList = Array.isArray(si.documents_requested) ? si.documents_requested.join(', ') : '';
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background:#ffffff;padding:28px 24px 20px;text-align:center;border:1px solid #e5e7eb;border-bottom:none;border-radius:8px 8px 0 0;">
    <img src="https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png" alt="Mundus Trade" width="200" style="display:inline-block;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
  </div>
  <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 15px; color: #2a1a20;">✓ Shipping instructions for <strong>Order ${escapeHtml(orderNumber)}</strong> have been <strong style="color:#15803d;">approved</strong>.</p>
    <p style="font-size: 14px; color: #2a1a20;">The supplier can now proceed with Bill of Lading issuance and vessel booking.</p>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #6b7280;">Port of Destination</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(si.port_of_destination || '—')}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Consignee</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(si.consignee_name || '—')}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Telex Release</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(si.telex_release || '—')}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Documents</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(docsList || '—')}</td></tr>
    </table>
  </div>
</div>`;

    const recipients = Array.from(new Set([
      reqRow?.buyer_email,
      supplierEmail,
    ].filter(Boolean) as string[]));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, email_sent: false, reason: 'no_recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Mundus Trade <noreply@mundustrade.com>',
        to: recipients,
        cc: ['docs@mundustrade.com'],
        subject: `✓ Shipping Instructions Approved — Order ${orderNumber}`,
        html,
      }),
    });
    const emailSent = resp.ok;
    if (!resp.ok) {
      const txt = await resp.text();
      console.warn('Resend approved notify failed', resp.status, txt);
    }

    const buyerCompanyId = reqRow?.buyer_email
      ? (await supabase.from('users').select('company_id').eq('email', reqRow.buyer_email).maybeSingle()).data?.company_id
      : null;
    const supplierCompanyId = supplier?.id ?? null;
    const notifBody = `Shipping instructions approved for order ${orderNumber}`;
    const orderLink = `/buyer/orders/${si.order_id}`;

    if (buyerCompanyId) {
      await insertAppNotificationForCompany(supabase, buyerCompanyId, {
        title: 'Shipping instructions approved',
        body: notifBody,
        icon: 'truck',
        category: 'orders',
        linkUrl: orderLink,
        relatedType: 'order',
        relatedId: si.order_id,
      });
    }
    if (supplierCompanyId) {
      await insertAppNotificationForCompany(supabase, supplierCompanyId, {
        title: 'Shipping instructions approved',
        body: notifBody,
        icon: 'truck',
        category: 'orders',
        linkUrl: `/supplier/sales/${si.order_id}`,
        relatedType: 'order',
        relatedId: si.order_id,
      });
    }

    return new Response(JSON.stringify({ success: true, email_sent: emailSent, recipients }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});