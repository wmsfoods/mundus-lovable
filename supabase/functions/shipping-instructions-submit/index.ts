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

    return new Response(JSON.stringify({ success: true, id: si.id, order_number: si.order_number }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});