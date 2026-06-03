import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { autoCounter, type Dial } from '../_shared/negotiation/autoEngineV2.ts';

interface ProposalItem { offer_item_id: string; price_per_kg: number; quantity_kg: number; }
interface RequestBody { negotiation_id: string; items: ProposalItem[]; }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  },
});
const errorResp = (code: string, message: string, status: number) => json({ error: code, message }, status);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }
  if (req.method !== 'POST') return errorResp('method_not_allowed', 'Use POST', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return errorResp('unauthenticated', 'Missing Bearer token', 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceKey || !anonKey) return errorResp('misconfigured', 'Missing env', 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader }}});
  const admin: SupabaseClient = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return errorResp('unauthenticated', 'Invalid token', 401);

  let body: RequestBody;
  try { body = await req.json(); } catch { return errorResp('invalid_json', 'Bad JSON', 400); }

  if (typeof body.negotiation_id !== 'string' || !Array.isArray(body.items) || body.items.length === 0) {
    return errorResp('invalid_payload', 'Expected { negotiation_id, items: [...] }', 400);
  }

  // Load negotiation + offer settings
  const { data: neg, error: negErr } = await admin
    .from('negotiations')
    .select('id, offer_id, buyer_company_id, status, locked_until, expires_at')
    .eq('id', body.negotiation_id).maybeSingle();
  if (negErr) return errorResp('db_error', negErr.message, 500);
  if (!neg) return errorResp('negotiation_not_found', 'Not found', 404);

  // Verify buyer membership
  const { data: cu } = await admin.from('company_users').select('company_id').eq('user_id', user.id);
  const userCompanies = (cu ?? []).map((r: any) => r.company_id);
  if (!userCompanies.includes(neg.buyer_company_id)) {
    return errorResp('forbidden', 'User not part of buyer company', 403);
  }

  // Load offer with auto/dial
  const { data: offer } = await admin
    .from('offers').select('id, negotiation_mode, negotiation_dial').eq('id', neg.offer_id).maybeSingle();
  if (!offer) return errorResp('offer_not_found', 'Offer missing', 404);
  if (offer.negotiation_mode !== 'auto') {
    return errorResp('not_auto', 'Offer is not in auto mode', 400);
  }
  const dial: Dial = (offer.negotiation_dial ?? 'balanced') as Dial;

  // Load offer items (need price + minimum_price)
  const itemIds = body.items.map(i => i.offer_item_id);
  const { data: offerItems } = await admin
    .from('offer_items').select('id, price, minimum_price, offer_id').in('id', itemIds);
  if (!offerItems || offerItems.length !== itemIds.length) {
    return errorResp('offer_item_not_found', 'Items missing', 404);
  }
  for (const oi of offerItems) {
    if (oi.offer_id !== neg.offer_id) return errorResp('item_mismatch', 'Item not in offer', 400);
  }
  const byId = new Map(offerItems.map((oi: any) => [oi.id, oi]));

  // Load history of cut_rounds with counter_proposals
  const { data: prev } = await admin
    .from('cut_rounds')
    .select('price_per_kg, offer_item_id, round_proposals!inner(round, negotiation_id), counter_proposals(price_per_kg)')
    .eq('round_proposals.negotiation_id', neg.id);

  type PrevRow = {
    price_per_kg: number; offer_item_id: string;
    round_proposals: { round: number; negotiation_id: string };
    counter_proposals: { price_per_kg: number }[] | null;
  };
  const history = new Map<string, { proposals: number[]; counters: number[] }>();
  const prevSorted = ((prev ?? []) as PrevRow[]).slice().sort((a, b) => a.round_proposals.round - b.round_proposals.round);
  for (const row of prevSorted) {
    if (!history.has(row.offer_item_id)) history.set(row.offer_item_id, { proposals: [], counters: [] });
    const h = history.get(row.offer_item_id)!;
    h.proposals.push(Number(row.price_per_kg));
    if (row.counter_proposals && row.counter_proposals[0]) h.counters.push(Number(row.counter_proposals[0].price_per_kg));
  }

  // Cycle calc: nextRound = max(round) + 1; cycle = ceil(nextRound / 2)
  const nextRound = prevSorted.length === 0 ? 1 : Math.max(...prevSorted.map((r: PrevRow) => r.round_proposals.round)) + 1;
  if (nextRound > 8) return errorResp('max_rounds_reached', 'Max 4 cycles (8 movements) reached', 409);
  const cycle = Math.ceil(nextRound / 2) as 1 | 2 | 3 | 4;

  // Compute counter per item
  const itemsWithCounters = body.items.map(it => {
    const oi: any = byId.get(it.offer_item_id);
    const h = history.get(it.offer_item_id) ?? { proposals: [], counters: [] };
    const counter = autoCounter({
      offerPrice: Number(oi.price),
      minimumPrice: Number(oi.minimum_price),
      bid: it.price_per_kg,
      prevBid: h.proposals.length > 0 ? h.proposals[h.proposals.length - 1] : null,
      prevCounter: h.counters.length > 0 ? h.counters[h.counters.length - 1] : null,
      cycle, dial,
    });
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

  // Insert via RPC (already exists)
  const { data: rpcResult, error: rpcErr } = await admin.rpc('submit_negotiation_round', {
    p_negotiation_id: neg.id,
    p_user_id: user.id,
    p_items: itemsWithCounters,
  });
  if (rpcErr) return errorResp('rpc_error', rpcErr.message, 500);

  // Audit log
  await admin.from('negotiation_audit').insert({
    negotiation_id: neg.id,
    action: 'engine_counter',
    actor_user_id: user.id,
    actor_role: 'engine',
    details: { cycle, dial, items: itemsWithCounters.map(i => ({ item: i.offer_item_id, counter: i.counter_price_per_kg, rule: i.counter_rule })) },
  });

  return json({
    success: true,
    round: nextRound,
    cycle,
    items: itemsWithCounters.map(i => ({
      offer_item_id: i.offer_item_id,
      counter_price_per_kg: i.counter_price_per_kg,
      counter_rule: i.counter_rule,
      counter_is_final: i.counter_is_final,
    })),
    rpc: rpcResult,
  });
});