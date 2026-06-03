import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { autoCounter, type Dial } from '../_shared/negotiation/autoEngineV2.ts';

interface ProposalItem { offer_item_id: string; price_per_kg: number; quantity_kg: number; }
interface RequestBody { negotiation_id: string; items: ProposalItem[]; }

interface NegotiationRow {
  id: string; offer_id: string; buyer_company_id: string;
  freight_cost_per_kg: number; status: string;
  locked_until: string | null; expires_at: string | null;
  negotiation_mode: string; negotiation_dial: string;
}
interface OfferItemRow { id: string; price: number; minimum_price: number; }

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

  if (typeof body.negotiation_id !== 'string' || !Array.isArray(body.items) || body.items.length === 0) {
    return errorResponse('invalid_payload', 'Expected { negotiation_id: uuid, items: [...] }', 400);
  }
  for (const it of body.items) {
    if (typeof it.offer_item_id !== 'string' || typeof it.price_per_kg !== 'number' ||
        typeof it.quantity_kg !== 'number' || it.price_per_kg <= 0 || it.quantity_kg <= 0) {
      return errorResponse('invalid_item', 'Each item must have offer_item_id, price_per_kg>0, quantity_kg>0', 400);
    }
  }

  const { data: neg, error: negErr } = await admin
    .from('negotiations')
    .select('id, offer_id, buyer_company_id, freight_cost_per_kg, status, locked_until, expires_at, negotiation_mode, negotiation_dial')
    .eq('id', body.negotiation_id)
    .maybeSingle<NegotiationRow>();
  if (negErr) return errorResponse('db_error', negErr.message, 500);
  if (!neg) return errorResponse('negotiation_not_found', 'Negotiation does not exist', 404);

  const { data: membership, error: memErr } = await admin
    .from('users').select('id, company_id').eq('id', user.id)
    .maybeSingle<{ id: string; company_id: string }>();
  if (memErr) return errorResponse('db_error', memErr.message, 500);
  if (!membership || membership.company_id !== neg.buyer_company_id) {
    return errorResponse('forbidden', 'User does not belong to the buyer company', 403);
  }

  if (neg.locked_until && new Date(neg.locked_until) > new Date()) {
    return errorResponse('negotiation_locked', `Locked until ${neg.locked_until}`, 409);
  }
  if (neg.expires_at && new Date(neg.expires_at) < new Date()) {
    return errorResponse('negotiation_expired', 'Negotiation expired', 409);
  }

  const itemIds = body.items.map((i) => i.offer_item_id);
  const { data: offerItems, error: oiErr } = await admin
    .from('offer_items').select('id, price, minimum_price, offer_id').in('id', itemIds);
  if (oiErr) return errorResponse('db_error', oiErr.message, 500);
  if (!offerItems || offerItems.length !== itemIds.length) {
    return errorResponse('offer_item_not_found', 'One or more offer_items not found', 404);
  }
  for (const oi of offerItems) {
    if (oi.offer_id !== neg.offer_id) {
      return errorResponse('offer_item_mismatch', 'offer_item does not belong to this offer', 400);
    }
  }
  const itemById = new Map(offerItems.map((oi: OfferItemRow & { offer_id: string }) => [oi.id, oi]));

  const { data: prev, error: prevErr } = await admin
    .from('cut_rounds')
    .select('price_per_kg, offer_item_id, round_proposals!inner(round, negotiation_id), counter_proposals(price_per_kg)')
    .eq('round_proposals.negotiation_id', neg.id);
  if (prevErr) return errorResponse('db_error', prevErr.message, 500);

  type PrevRow = {
    price_per_kg: number; offer_item_id: string;
    round_proposals: { round: number; negotiation_id: string };
    counter_proposals: { price_per_kg: number } | null;
  };
  const historyByItem = new Map<string, { proposals: number[]; counters: number[] }>();
  const prevSorted = (prev as PrevRow[]).slice().sort((a, b) => a.round_proposals.round - b.round_proposals.round);
  for (const row of prevSorted) {
    if (!historyByItem.has(row.offer_item_id)) {
      historyByItem.set(row.offer_item_id, { proposals: [], counters: [] });
    }
    const h = historyByItem.get(row.offer_item_id)!;
    h.proposals.push(Number(row.price_per_kg));
    if (row.counter_proposals) h.counters.push(Number(row.counter_proposals.price_per_kg));
  }

  const nextRound = (prevSorted.length === 0
    ? 1
    : Math.max(...prevSorted.map((r) => r.round_proposals.round)) + 1) as 1 | 2 | 3 | 4;
  if (nextRound > 3) {
    return errorResponse('max_rounds_reached', 'Maximum of 3 rounds reached', 409);
  }

  let buyerHasNegotiatedBefore = false;
  if (nextRound === 1) {
    const { data: offerInfo, error: oErr } = await admin
      .from('offers').select('supplier_id').eq('id', neg.offer_id)
      .maybeSingle<{ supplier_id: string }>();
    if (oErr) return errorResponse('db_error', oErr.message, 500);
    if (offerInfo) {
      const { data: priorDeals, error: priorErr } = await admin
        .from('negotiations').select('id, offers!inner(supplier_id)')
        .eq('buyer_company_id', neg.buyer_company_id).eq('status', 'bid_accepted')
        .eq('offers.supplier_id', offerInfo.supplier_id).neq('id', neg.id).limit(1);
      if (priorErr) return errorResponse('db_error', priorErr.message, 500);
      buyerHasNegotiatedBefore = (priorDeals?.length ?? 0) > 0;
    }
  }

  const itemsWithCounters = body.items.map((it) => {
    const offerItem = itemById.get(it.offer_item_id)!;
    const history = historyByItem.get(it.offer_item_id) ?? { proposals: [], counters: [] };
    const input: GenerateCounterProposalInput = {
      round: nextRound as RoundNumber,
      offerPrice: Number(offerItem.price),
      minimumPrice: Number(offerItem.minimum_price),
      freightPerKg: Number(neg.freight_cost_per_kg),
      proposal: it.price_per_kg,
      previousProposals: history.proposals,
      previousCounterProposals: history.counters,
      buyerHasNegotiatedBefore,
    };
    const counter = generateCounterProposal(input);
    return {
      offer_item_id: it.offer_item_id,
      price_per_kg: it.price_per_kg,
      quantity_kg: it.quantity_kg,
      counter_price_per_kg: counter.price,
      counter_rule: counter.rule,
      counter_explanation: counter.explanation,
      counter_is_final: counter.isFinal,
    };
  });

  const { data: rpcResult, error: rpcErr } = await admin.rpc('submit_negotiation_round', {
    p_negotiation_id: neg.id,
    p_user_id: user.id,
    p_items: itemsWithCounters,
  });

  if (rpcErr) {
    const code = rpcErr.message;
    if (code.includes('negotiation_not_found')) return errorResponse('negotiation_not_found', code, 404);
    if (code.includes('invalid_status')) return errorResponse('invalid_status', code, 409);
    if (code.includes('negotiation_locked')) return errorResponse('negotiation_locked', code, 409);
    if (code.includes('negotiation_expired')) return errorResponse('negotiation_expired', code, 409);
    if (code.includes('max_rounds_reached')) return errorResponse('max_rounds_reached', code, 409);
    return errorResponse('rpc_error', rpcErr.message, 500);
  }

  return json({
    success: true,
    round: nextRound,
    items: itemsWithCounters.map((i) => ({
      offer_item_id: i.offer_item_id,
      counter_price_per_kg: i.counter_price_per_kg,
      counter_rule: i.counter_rule,
      counter_explanation: i.counter_explanation,
      counter_is_final: i.counter_is_final,
    })),
    rpc: rpcResult,
  });
});
