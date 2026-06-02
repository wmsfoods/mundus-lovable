import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { token, ...fields } = body;
    if (!token) {
      return new Response(JSON.stringify({ error: 'missing_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: reqRow } = await supabase
      .from('shipping_instructions_requests')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!reqRow) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (reqRow.status === 'inactive') {
      return new Response(JSON.stringify({ error: 'inactive' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (new Date(reqRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!fields.consignee_name || !fields.port_of_destination || !fields.telex_release) {
      return new Response(JSON.stringify({ error: 'missing_required_fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    const insertPayload = {
      request_id: reqRow.id,
      order_id: reqRow.order_id,
      offer_id: reqRow.offer_id,
      order_number: fields.order_number ?? null,
      buyer_name: fields.buyer_name ?? null,
      buyer_address: fields.buyer_address ?? null,
      port_of_destination: fields.port_of_destination ?? null,
      country_of_destination: fields.country_of_destination ?? null,
      consignee_name: fields.consignee_name ?? null,
      consignee_address: fields.consignee_address ?? null,
      consignee_phone: fields.consignee_phone ?? null,
      consignee_fax: fields.consignee_fax ?? null,
      notify_same_as_consignee: !!fields.notify_same_as_consignee,
      notify_name: fields.notify_name ?? null,
      notify_address: fields.notify_address ?? null,
      notify_phone: fields.notify_phone ?? null,
      notify_fax: fields.notify_fax ?? null,
      documents_requested: fields.documents_requested ?? [],
      telex_release: fields.telex_release ?? null,
      approved_shipping_lines: fields.approved_shipping_lines ?? [],
      observations: fields.observations ?? null,
      importer_reference: fields.importer_reference ?? null,
      doc_delivery_company: fields.doc_delivery_company ?? null,
      doc_delivery_address: fields.doc_delivery_address ?? null,
      doc_delivery_city: fields.doc_delivery_city ?? null,
      doc_delivery_state: fields.doc_delivery_state ?? null,
      doc_delivery_postal_code: fields.doc_delivery_postal_code ?? null,
      doc_delivery_country: fields.doc_delivery_country ?? null,
      doc_delivery_contact_name: fields.doc_delivery_contact_name ?? null,
      doc_delivery_contact_phone: fields.doc_delivery_contact_phone ?? null,
      submitted_at: new Date().toISOString(),
      submitted_by_ip: ip,
    };

    const { data: si, error: insErr } = await supabase
      .from('shipping_instructions')
      .insert(insertPayload)
      .select('id, order_number')
      .single();
    if (insErr) throw insErr;

    await supabase
      .from('shipping_instructions_requests')
      .update({ status: 'received', submitted_at: new Date().toISOString() })
      .eq('id', reqRow.id);

    // Notify supplier via email (best effort)
    const RESEND_API_KEY = Deno.env.get('resend_mundus') || Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY && reqRow.order_id) {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select(`
            order_number, placed_at,
            offer:offers(supplier:companies!offers_supplier_id_fkey(id, name))
          `)
          .eq('id', reqRow.order_id)
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
          : (fields.order_number || 'pending');
        const docsList = Array.isArray(fields.documents_requested) ? fields.documents_requested.join(', ') : '';
        const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background:#ffffff;padding:28px 24px 20px;text-align:center;border:1px solid #e5e7eb;border-bottom:none;border-radius:8px 8px 0 0;">
    <img src="https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png" alt="Mundus Trade" width="200" style="display:inline-block;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
  </div>
  <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 15px; color: #2a1a20;">✅ Shipping instructions have been submitted for <strong>Order ${escapeHtml(orderNumber)}</strong>.</p>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #6b7280;">Port of Destination</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(fields.port_of_destination || '—')}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Consignee</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(fields.consignee_name || '—')}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Telex Release</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(fields.telex_release || '—')}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Documents</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(docsList || '—')}</td></tr>
    </table>
    <p style="font-size: 14px; color: #2a1a20;">Log in to Mundus Trade to review and approve the instructions.</p>
  </div>
</div>`;
        const recipients = [supplierEmail].filter(Boolean) as string[];
        if (recipients.length > 0) {
          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Mundus Trade <noreply@mundustrade.com>',
              to: recipients,
              cc: ['docs@mundustrade.com'],
              subject: `✅ Shipping Instructions Received — Order ${orderNumber}`,
              html,
            }),
          });
          if (!resp.ok) console.warn('Resend notify failed', resp.status, await resp.text());
        }
      } catch (err) {
        console.warn('Supplier notify error:', String((err as Error)?.message ?? err));
      }
    }

    return new Response(JSON.stringify({ success: true, id: si.id, order_number: si.order_number }), {
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