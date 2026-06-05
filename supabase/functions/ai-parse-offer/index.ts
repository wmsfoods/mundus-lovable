import { createClient } from 'npm:@supabase/supabase-js@2';

// Configurable model — swap to google/gemini-2.5-pro if Flash is insufficient.
const MODEL = 'google/gemini-2.5-flash';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type MatchStatus = 'exact' | 'fuzzy' | 'not_found' | 'none';

function norm(s: string | null | undefined): string {
  return (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function fuzzyMatch<T extends { _key: string }>(needle: string, list: T[]): T | null {
  const n = norm(needle);
  if (!n) return null;
  // exact
  const exact = list.find((x) => x._key === n);
  if (exact) return exact;
  // substring both ways
  const sub = list.find((x) => x._key.includes(n) || n.includes(x._key));
  return sub ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { text?: string; supplierId?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const text = (body.text ?? '').trim();
  const supplierId = (body.supplierId ?? '').trim() || null;
  if (!text) {
    return new Response(JSON.stringify({ error: 'empty_text' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (text.length > 20000) {
    return new Response(JSON.stringify({ error: 'text_too_long' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Load context in parallel.
  const [brandsRes, plantsRes, countriesRes, paymentsRes] = await Promise.all([
    supplierId
      ? supabase.from('supplier_brands').select('id,name').eq('company_id', supplierId).limit(200)
      : Promise.resolve({ data: [], error: null }),
    supplierId
      ? supabase.from('company_plants')
          .select('id,plant_number,name,country')
          .eq('company_id', supplierId)
          .eq('is_active', true)
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('countries').select('id,english_name,iso_code,flag_emoji').limit(500),
    supabase.from('payment_terms').select('label').eq('is_active', true).eq('scope', 'international').limit(100),
  ]);

  const cutsRes = await supabase
    .from('cuts')
    .select('id,name,category,bone_spec')
    .eq('is_active', true)
    .limit(1000);

  const brands = (brandsRes.data ?? []).map((b: any) => ({ id: b.id as string, name: b.name as string, _key: norm(b.name) }));
  const plants = (plantsRes.data ?? []).map((p: any) => ({
    id: p.id as string, plant_number: (p.plant_number ?? '') as string, name: (p.name ?? '') as string,
    country: (p.country ?? '') as string, _key: norm(p.plant_number || p.name),
  }));
  const countries = (countriesRes.data ?? []).map((c: any) => ({
    id: c.id as string, name: c.english_name as string, iso: (c.iso_code ?? '') as string,
    flag: (c.flag_emoji ?? '🏳️') as string, _key: norm(c.english_name),
  }));
  const paymentTerms = (paymentsRes.data ?? []).map((p: any) => ({ label: p.label as string, _key: norm(p.label) }));
  const cuts = (cutsRes.data ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    category: (c.category ?? '') as string,
    bone_spec: (c.bone_spec ?? '') as string,
    _key: norm(c.name),
  }));

  const systemPrompt = `You extract structured meat offer data from raw text emails, spec sheets, or chat messages.
Return ONLY valid JSON matching the schema below. No markdown code fences, no commentary, no prose outside the JSON.

Allowed enums:
- incoterms: FOB, CFR, CIF, EXW, DDP, DAP
- containerSize: 20ft, 40ft
- temperature: Frozen, Chilled
- protein: Beef, Pork, Poultry, Ovine
- spec: Bone-In, Boneless, Offals
- packing: Carton Box, Vacuum Pack, Bulk, Tray

Conversion rules:
- Quantities → kilograms (convert lbs ×0.4536, tons/MT ×1000).
- Prices → USD per kg (convert /lb ×2.2046, /MT ÷1000). If currency missing assume USD.
- shipmentReady → YYYY-MM (e.g. "June 2026" → "2026-06"). Null if absent.

Known supplier brands (use exact name when match):
${brands.map(b => `- ${b.name}`).join('\n') || '(none)'}

Known supplier plants (plant_number — name — country):
${plants.map(p => `- ${p.plant_number || '?'} — ${p.name || '?'} — ${p.country || '?'}`).join('\n') || '(none)'}

Known payment terms (use exact label when match):
${paymentTerms.map(p => `- ${p.label}`).join('\n') || '(none)'}

JSON schema to return:
{
  "brand": { "name": string|null },
  "origin": { "countryName": string|null, "portName": string|null },
  "destinations": [{ "countryName": string, "portNames": string[], "freightUsd": number|null, "insuranceUsd": number|null }],
  "sameFreightGlobal": boolean,
  "globalFreight": number|null,
  "globalInsurance": number|null,
  "incoterms": string[],
  "containerSize": "20ft"|"40ft"|null,
  "fclCount": number|null,
  "temperature": "Frozen"|"Chilled"|null,
  "shipmentReady": string|null,
  "paymentTerms": string|null,
  "items": [{
    "cutName": string,
    "protein": "Beef"|"Pork"|"Poultry"|"Ovine"|null,
    "spec": "Bone-In"|"Boneless"|"Offals"|null,
    "packing": string|null,
    "plantNumber": string|null,
    "qtyKg": number|null,
    "askPricePerKg": number|null,
    "notes": string|null
  }]
}

Important:
- "incoterms" must be an array — if the user writes "CFR, CIF, FOB" return ["CFR","CIF","FOB"].
- "destinations[].portNames" must be an array — if the user writes "Buenos Aires + Montevideo - Argentina" return one destination with portNames ["Buenos Aires","Montevideo"]. Each distinct country = one destination entry.
- "sameFreightGlobal" true ONLY if the text explicitly says one freight value applies to ALL destinations (e.g. "Same freight USD 4500 for all destinations"). Otherwise false and put per-destination values in freightUsd/insuranceUsd.

If something is missing in the text, set the field to null (or empty array/false). Never invent values.`;

  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!aiResp.ok) {
    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'AI rate limit, try again shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: 'payment_required', message: 'AI credits exhausted.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const t = await aiResp.text();
    console.error('AI gateway error', aiResp.status, t);
    return new Response(JSON.stringify({ error: 'ai_error', detail: t.slice(0, 500) }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await aiResp.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';
  let parsed: any = null;
  try {
    // Strip optional markdown fences just in case.
    const cleaned = String(raw).replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON parse failed', e, raw);
    return new Response(JSON.stringify({ error: 'ai_invalid_json', raw: String(raw).slice(0, 500) }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ---- Post-process / resolve IDs ----
  const resolveBrand = (name: string | null) => {
    if (!name) return { name: null, id: null, match: 'none' as MatchStatus };
    const exact = brands.find((b) => b._key === norm(name));
    if (exact) return { name: exact.name, id: exact.id, match: 'exact' as MatchStatus };
    const fuzzy = fuzzyMatch(name, brands);
    if (fuzzy) return { name: fuzzy.name, id: fuzzy.id, match: 'fuzzy' as MatchStatus, suggested: name };
    return { name, id: null, match: 'not_found' as MatchStatus };
  };

  const resolvePlant = (plantNumber: string | null) => {
    if (!plantNumber) return { plantNumber: null, plantId: null, match: 'none' as MatchStatus };
    const exact = plants.find((p) => norm(p.plant_number) === norm(plantNumber));
    if (exact) return { plantNumber: exact.plant_number, plantId: exact.id, match: 'exact' as MatchStatus };
    const fuzzy = fuzzyMatch(plantNumber, plants);
    if (fuzzy) return { plantNumber: fuzzy.plant_number || plantNumber, plantId: fuzzy.id, match: 'fuzzy' as MatchStatus };
    return { plantNumber, plantId: null, match: 'not_found' as MatchStatus };
  };

  const resolveCountry = (name: string | null) => {
    if (!name) return null;
    const exact = countries.find((c) => c._key === norm(name));
    if (exact) return { id: exact.id, name: exact.name, iso: exact.iso, flag: exact.flag, match: 'exact' as MatchStatus };
    const fuzzy = fuzzyMatch(name, countries);
    if (fuzzy) return { id: fuzzy.id, name: fuzzy.name, iso: fuzzy.iso, flag: fuzzy.flag, match: 'fuzzy' as MatchStatus };
    return { id: null, name, iso: '', flag: '🏳️', match: 'not_found' as MatchStatus };
  };

  const resolvePayment = (label: string | null) => {
    if (!label) return { label: null, match: 'none' as MatchStatus };
    const exact = paymentTerms.find((p) => p._key === norm(label));
    if (exact) return { label: exact.label, match: 'exact' as MatchStatus };
    const fuzzy = fuzzyMatch(label, paymentTerms);
    if (fuzzy) return { label: fuzzy.label, match: 'fuzzy' as MatchStatus, suggested: label };
    return { label, match: 'not_found' as MatchStatus };
  };

  // Cut resolution returns top candidate + up to 5 alternatives (substring/word overlap scoring).
  function scoreCut(needle: string, cut: { name: string; _key: string }) {
    const n = norm(needle);
    if (!n) return 0;
    if (cut._key === n) return 100;
    if (cut._key.includes(n) || n.includes(cut._key)) {
      const lenScore = Math.min(cut._key.length, n.length) / Math.max(cut._key.length, n.length);
      return 70 + Math.round(lenScore * 25);
    }
    const nWords = new Set(n.split(' ').filter((w) => w.length > 2));
    const cWords = new Set(cut._key.split(' ').filter((w) => w.length > 2));
    let overlap = 0;
    nWords.forEach((w) => { if (cWords.has(w)) overlap++; });
    if (overlap === 0) return 0;
    return Math.round((overlap / Math.max(nWords.size, cWords.size)) * 65);
  }

  function resolveCut(name: string | null) {
    if (!name) return { id: null, name: null, match: 'none' as MatchStatus, candidates: [] as Array<{ id: string; name: string; score: number }> };
    const scored = cuts
      .map((c) => ({ id: c.id, name: c.name, score: scoreCut(name, c) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    if (scored.length === 0) return { id: null, name, match: 'not_found' as MatchStatus, candidates: [] };
    const top = scored[0];
    if (top.score >= 100) return { id: top.id, name: top.name, match: 'exact' as MatchStatus, candidates: scored };
    if (top.score >= 60) return { id: top.id, name: top.name, match: 'fuzzy' as MatchStatus, candidates: scored };
    return { id: null, name, match: 'not_found' as MatchStatus, candidates: scored };
  }

  const result = {
    brand: resolveBrand(parsed?.brand?.name ?? null),
    origin: {
      country: resolveCountry(parsed?.origin?.countryName ?? null),
      portName: parsed?.origin?.portName ?? null,
    },
    destinations: Array.isArray(parsed?.destinations) ? parsed.destinations.map((d: any) => ({
      country: resolveCountry(d?.countryName ?? null),
      portNames: Array.isArray(d?.portNames)
        ? d.portNames.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
        : (typeof d?.portName === 'string' && d.portName ? [d.portName] : []),
      freightUsd: typeof d?.freightUsd === 'number' ? d.freightUsd : null,
      insuranceUsd: typeof d?.insuranceUsd === 'number' ? d.insuranceUsd : null,
    })) : [],
    sameFreightGlobal: parsed?.sameFreightGlobal === true,
    globalFreight: typeof parsed?.globalFreight === 'number' ? parsed.globalFreight : null,
    globalInsurance: typeof parsed?.globalInsurance === 'number' ? parsed.globalInsurance : null,
    incoterms: Array.isArray(parsed?.incoterms) ? parsed.incoterms.filter((x: any) => typeof x === 'string') : [],
    containerSize: parsed?.containerSize === '20ft' || parsed?.containerSize === '40ft' ? parsed.containerSize : null,
    fclCount: typeof parsed?.fclCount === 'number' ? parsed.fclCount : null,
    temperature: parsed?.temperature === 'Frozen' || parsed?.temperature === 'Chilled' ? parsed.temperature : null,
    shipmentReady: typeof parsed?.shipmentReady === 'string' ? parsed.shipmentReady : null,
    paymentTerms: resolvePayment(parsed?.paymentTerms ?? null),
    items: Array.isArray(parsed?.items) ? parsed.items.map((it: any) => ({
      cutName: String(it?.cutName ?? '').trim(),
      protein: ['Beef','Pork','Poultry','Ovine'].includes(it?.protein) ? it.protein : null,
      spec: ['Bone-In','Boneless','Offals'].includes(it?.spec) ? it.spec : null,
      packing: typeof it?.packing === 'string' ? it.packing : null,
      qtyKg: typeof it?.qtyKg === 'number' ? it.qtyKg : null,
      askPricePerKg: typeof it?.askPricePerKg === 'number' ? it.askPricePerKg : null,
      notes: typeof it?.notes === 'string' ? it.notes : null,
      plant: resolvePlant(it?.plantNumber ?? null),
      cut: resolveCut(String(it?.cutName ?? '').trim() || null),
    })) : [],
    model: MODEL,
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});