import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

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

/** Decode base64 to Uint8Array (Deno-safe). */
function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^;]+;base64,/, '');
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Convert an Excel workbook (first sheet) into a structured plain-text representation. */
function xlsxToText(bytes: Uint8Array): string {
  const wb = XLSX.read(bytes, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return '';
  const ws = wb.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  if (rows.length === 0) return '';
  const headers = (rows[0] ?? []).map((h: any) => String(h ?? '').trim());
  const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c ?? '').trim().length > 0));
  const lines = dataRows.map((r, i) => {
    const parts = headers.map((h, idx) => {
      const v = r[idx];
      if (v === undefined || v === null || String(v).trim() === '') return null;
      return `${h || `Col${idx + 1}`}=${String(v).trim()}`;
    }).filter(Boolean);
    return `Row ${i + 1}: ${parts.join(', ')}`;
  });
  return `Sheet: ${firstSheetName}\nHeaders: ${headers.join(' | ')}\n${lines.join('\n')}`;
}

/** Extract text from a PDF using unpdf (Deno/Node compatible). */
async function pdfToText(bytes: Uint8Array): Promise<string> {
  // @deno-types removed; dynamic import for tree-shake
  const { extractText, getDocumentProxy } = await import('npm:unpdf@0.12.1');
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join('\n') : String(text ?? '');
}

/** Extract text from a .docx using mammoth. */
async function docxToText(bytes: Uint8Array): Promise<string> {
  const mammoth = await import('npm:mammoth@1.8.0');
  const result = await (mammoth as any).extractRawText({ buffer: bytes });
  return String(result?.value ?? '');
}

/** Route a file (by name/type) to the right extractor; throws with a friendly message. */
async function extractFileText(file: { name: string; type: string; base64: string }): Promise<string> {
  const bytes = b64ToBytes(file.base64);
  if (bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error('File exceeds 5MB limit.');
  }
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const t = (file.type ?? '').toLowerCase();
  const isXlsx = ext === 'xlsx' || ext === 'xls' || t.includes('spreadsheet') || t.includes('excel');
  const isPdf = ext === 'pdf' || t.includes('pdf');
  const isDocx = ext === 'docx' || ext === 'doc' || t.includes('word') || t.includes('officedocument.wordprocessing');
  if (isXlsx) {
    const text = xlsxToText(bytes);
    if (!text.trim()) throw new Error('Excel sheet appears empty.');
    return text;
  }
  if (isPdf) {
    const text = await pdfToText(bytes);
    if (!text.trim()) throw new Error('PDF appears to be image-based. Please use a text PDF or the Excel template.');
    return text;
  }
  if (isDocx) {
    const text = await docxToText(bytes);
    if (!text.trim()) throw new Error('Word document appears empty.');
    return text;
  }
  throw new Error(`Unsupported file type: ${file.name}`);
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

  let body: {
    text?: string;
    audioTranscript?: string;
    file?: { name: string; type: string; base64: string };
    supplierId?: string;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supplierId = (body.supplierId ?? '').trim() || null;

  // Resolve `text` from one of: text, audioTranscript, file extraction.
  let text = ((body.text ?? body.audioTranscript) ?? '').trim();
  if (!text && body.file) {
    try {
      text = (await extractFileText(body.file)).trim();
    } catch (e: any) {
      console.error('File extraction failed', e);
      return new Response(JSON.stringify({
        error: 'file_extraction_failed',
        message: e?.message || 'Could not extract text from file.',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  if (!text) {
    return new Response(JSON.stringify({ error: 'empty_input', message: 'Provide text, audioTranscript, or file.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (text.length > 40000) {
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
- pricingModel: FOB, CFR, CIF, EXW

Pricing-model detection (CRITICAL):
- Determine whether the QUOTED PRICE per item is FOB (origin port, freight quoted separately), CFR/CIF (price INCLUDES freight to a destination "anchor" port), or EXW (ex-works, treat similar to FOB).
- Examples:
  - "FOB Santos USD 4.20/kg, freight USD 0.18/kg to Shanghai" → pricingModel "FOB", pricingReferencePortName "Santos"
  - "CFR Shanghai USD 4.38/kg" → pricingModel "CFR", pricingReferencePortName "Shanghai"
  - "USD 4.20 delivered Hong Kong" → pricingModel "CFR", pricingReferencePortName "Hong Kong"
  - "EXW plant USD 4.10/kg" → pricingModel "EXW", pricingReferencePortName null
  - Just "price 4.20/kg" with no incoterm context → pricingModel null
- When pricingModel is FOB or EXW, item prices are pure origin price; freight values for destinations must be separate.
- When pricingModel is CFR or CIF, the item price ALREADY includes freight to pricingReferencePortName.
- If multiple pricing models are mentioned, pick the most explicit / first.

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
  "pricingModel": "FOB"|"CFR"|"CIF"|"EXW"|null,
  "pricingReferencePortName": string|null,
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

  // ---- Pricing model + reference port resolution ----
  const rawPricingModel = parsed?.pricingModel;
  const pricingModel: 'FOB' | 'CFR' | 'CIF' | 'EXW' | null =
    rawPricingModel === 'FOB' || rawPricingModel === 'CFR' ||
    rawPricingModel === 'CIF' || rawPricingModel === 'EXW'
      ? rawPricingModel
      : null;
  const refPortName: string | null = typeof parsed?.pricingReferencePortName === 'string'
    ? parsed.pricingReferencePortName.trim() || null
    : null;

  let pricingReferencePort: { name: string | null; id: string | null; match: MatchStatus; countryId: string | null } = {
    name: refPortName, id: null, match: refPortName ? 'not_found' : 'none', countryId: null,
  };
  if (refPortName) {
    // For FOB/EXW the anchor is the origin port; for CFR/CIF it's a destination port.
    // Constrain by candidate countries to keep the lookup small.
    const candidateCountryIds: string[] = [];
    if (pricingModel === 'FOB' || pricingModel === 'EXW') {
      if ((result.origin.country as any)?.id) candidateCountryIds.push((result.origin.country as any).id);
    } else {
      for (const d of result.destinations) {
        if ((d.country as any)?.id) candidateCountryIds.push((d.country as any).id);
      }
    }
    let portsQuery = supabase.from('ports').select('id,name,country_id').limit(50);
    if (candidateCountryIds.length > 0) {
      portsQuery = supabase.from('ports').select('id,name,country_id').in('country_id', candidateCountryIds).limit(200);
    } else {
      portsQuery = supabase.from('ports').select('id,name,country_id').ilike('name', `%${refPortName}%`).limit(50);
    }
    const { data: portRows } = await portsQuery;
    const portList = (portRows ?? []).map((p: any) => ({
      id: p.id as string, name: p.name as string, country_id: (p.country_id ?? null) as string | null,
      _key: norm(p.name),
    }));
    const exact = portList.find((p) => p._key === norm(refPortName));
    if (exact) {
      pricingReferencePort = { name: exact.name, id: exact.id, match: 'exact', countryId: exact.country_id };
    } else {
      const fuzzy = fuzzyMatch(refPortName, portList);
      if (fuzzy) {
        pricingReferencePort = { name: fuzzy.name, id: fuzzy.id, match: 'fuzzy', countryId: fuzzy.country_id };
      }
    }
  }

  (result as any).pricingModel = pricingModel;
  (result as any).pricingReferencePort = pricingReferencePort;

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});