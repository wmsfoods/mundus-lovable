import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const ip = getClientIp(req);
    const rl = await checkRateLimit(supabase, {
      key: `si-validate:ip:${ip}`,
      windowSeconds: 60,
      max: 20,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: 'missing_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: reqRow } = await supabase
      .from('shipping_instructions_requests')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!reqRow) {
      return new Response(JSON.stringify({ valid: false, error: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (reqRow.status === 'inactive') {
      return new Response(JSON.stringify({ valid: false, error: 'inactive' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (new Date(reqRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'expired' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const alreadySubmitted = !!reqRow.submitted_at;

    // Pre-fill: order data
    let orderData: Record<string, unknown> = {};
    if (reqRow.order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          id, order_number, incoterm, fcl_count, placed_at,
          destination_port:ports!destination_port_id(name, country:countries(english_name)),
          offer:offers(id, supplier_id, origin_port, origin_country, supplier:companies!offers_supplier_id_fkey(name)),
          buyer_user:users!orders_buyer_id_fkey(name, email, company:companies!users_company_id_fkey(name, address, city, state, country, zip_code)),
          items:order_items(customer_product_name, settlement_amount)
        `)
        .eq('id', reqRow.order_id)
        .maybeSingle();

      if (order) {
        const buyerUser = Array.isArray(order.buyer_user) ? order.buyer_user[0] : order.buyer_user;
        const buyerCompany = buyerUser?.company && (Array.isArray(buyerUser.company) ? buyerUser.company[0] : buyerUser.company);
        const destPort = Array.isArray(order.destination_port) ? order.destination_port[0] : order.destination_port;
        const destCountry = destPort?.country && (Array.isArray(destPort.country) ? destPort.country[0] : destPort.country);
        const offer = Array.isArray(order.offer) ? order.offer[0] : order.offer;
        const supplier = offer?.supplier && (Array.isArray(offer.supplier) ? offer.supplier[0] : offer.supplier);
        orderData = {
          order_id: order.id,
          offer_id: offer?.id ?? null,
          order_number: `M-${String(order.order_number).padStart(6, '0')}-${new Date(order.placed_at).getFullYear()}`,
          incoterm: order.incoterm,
          fcl_count: order.fcl_count,
          buyer_name: buyerCompany?.name ?? buyerUser?.name ?? '',
          buyer_address: [buyerCompany?.address, buyerCompany?.city, buyerCompany?.state, buyerCompany?.zip_code, buyerCompany?.country].filter(Boolean).join(', '),
          buyer_email: buyerUser?.email ?? '',
          port_of_destination: destPort?.name ?? '',
          country_of_destination: destCountry?.english_name ?? '',
          origin_port: offer?.origin_port ?? '',
          origin_country: offer?.origin_country ?? '',
          supplier_name: supplier?.name ?? '',
          items: (order.items ?? []).map((i: { customer_product_name: string; settlement_amount: number }) => ({
            name: i.customer_product_name, weight_kg: Number(i.settlement_amount || 0),
          })),
        };
      }
    }

    // Previous SI (if resubmitting)
    const { data: previous } = await supabase
      .from('shipping_instructions')
      .select('*')
      .eq('request_id', reqRow.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(JSON.stringify({
      valid: true,
      already_submitted: alreadySubmitted,
      request_id: reqRow.id,
      buyer_email: reqRow.buyer_email,
      buyer_name: reqRow.buyer_name,
      order_data: orderData,
      previous_instructions: previous,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});