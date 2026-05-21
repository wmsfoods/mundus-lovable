import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SYSTEM_PROMPT = `You are an expert B2B sales strategist for Mundus Trade, a B2B marketplace for animal protein imports/exports.`;

function buildPrompt(input: {
  company_name: string;
  company_type: string;
  country: string;
  contact_name: string;
  contact_role: string;
  contact_linkedin: string;
  contact_phone: string;
  interview_notes: string;
}) {
  return `Generate a comprehensive meeting prep document for an upcoming demo with a prospective client.

CLIENT CONTEXT:
- Company: ${input.company_name}
- Type: ${input.company_type}
- Country: ${input.country}
- Industry context: animal protein trading (beef, poultry, pork, lamb)
- Primary contact: ${input.contact_name}, ${input.contact_role}
- LinkedIn: ${input.contact_linkedin}
- Phone: ${input.contact_phone}

MUNDUS TRADE VALUE PROPS (USE THESE):
- Direct from verified producers (no traders/middlemen on supply side)
- 100% free for buyers (no fees, no commissions, no subscription)
- Complete document verification (SIF, plant numbers, export licenses)
- Price transparency — all offers standardized (product, price, incoterm, port, specs)
- Speed: negotiate, counter-offer, close in minutes instead of days
- Active demand posting — buyers post what they want, suppliers respond
- 30 years of network in animal protein trade (Fernando Nascimento)
- Backed by CABC (Câmara Árabe Brasileira de Comércio)

PREVIOUS INTERVIEW NOTES:
${input.interview_notes || '(none)'}

GENERATE THE FOLLOWING SECTIONS as a JSON object:

{
  "company_research": "2-3 paragraphs about the company — likely business model, market position, size estimate based on country and type",
  "contact_profile": "1-2 paragraphs about the contact role/persona — what they care about, decision-making power, KPIs",
  "market_context": "1-2 paragraphs about the protein import market in their country — main suppliers, dynamics, recent developments",
  "likely_pain_points": ["5-7 bullet pain points this buyer/supplier likely faces TODAY"],
  "talking_points": ["5-7 talking points tailored to this company — anchor each to a Mundus value prop"],
  "strategic_questions": ["5-7 open-ended questions to qualify, understand needs, create urgency"],
  "mundus_value_props": ["3-4 most relevant Mundus value props with one-line WHY each resonates"],
  "research_links": [{"title": "...", "url": "..."}]
}

Respond with ONLY the JSON, no preamble, no markdown fences.`;
}

function toMarkdown(p: any, company: string): string {
  const list = (arr: any) => Array.isArray(arr) ? arr.map((x: any) => `- ${typeof x === 'string' ? x : JSON.stringify(x)}`).join('\n') : '';
  return `# Meeting Prep — ${company}

## Company Research
${p.company_research ?? ''}

## Contact Profile
${p.contact_profile ?? ''}

## Market Context
${p.market_context ?? ''}

## Likely Pain Points
${list(p.likely_pain_points)}

## Talking Points
${list(p.talking_points)}

## Strategic Questions
${list(p.strategic_questions)}

## Mundus Value Props
${list(p.mundus_value_props)}

## Research Links
${Array.isArray(p.research_links) ? p.research_links.map((l: any) => `- [${l.title}](${l.url})`).join('\n') : ''}
`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { meeting_prep_id } = await req.json();
    if (!meeting_prep_id) {
      return new Response(JSON.stringify({ error: 'meeting_prep_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('crm_meeting_preps').update({ status: 'generating' }).eq('id', meeting_prep_id);

    const { data: prep, error: prepErr } = await supabase
      .from('crm_meeting_preps').select('*').eq('id', meeting_prep_id).single();
    if (prepErr || !prep) throw new Error(prepErr?.message || 'prep not found');

    const { data: company } = await supabase
      .from('crm_companies').select('*').eq('id', prep.crm_company_id).single();
    if (!company) throw new Error('company not found');

    const { data: contacts } = await supabase
      .from('crm_contacts').select('*').eq('company_id', prep.crm_company_id);
    const contact = (contacts || []).find((c: any) => c.id === prep.crm_contact_id)
      ?? (contacts || []).find((c: any) => c.is_primary) ?? (contacts || [])[0];

    const { data: interviews } = await supabase
      .from('crm_interviews').select('*').eq('crm_company_id', prep.crm_company_id)
      .order('interview_date', { ascending: false }).limit(5);

    const interviewNotes = (interviews || []).map((iv: any) =>
      `[${iv.interview_date ?? '?'}] Pain: ${iv.pain_points ?? '—'}\nTakeaways: ${iv.takeaways ?? '—'}`
    ).join('\n\n');

    const prompt = buildPrompt({
      company_name: company.name,
      company_type: company.company_type ?? '—',
      country: company.country ?? '—',
      contact_name: contact?.full_name ?? '—',
      contact_role: contact?.role ?? '—',
      contact_linkedin: contact?.linkedin ?? '—',
      contact_phone: contact?.phone ?? '—',
      interview_notes: interviewNotes,
    });

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${errText}`);
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content ?? '';

    let parsed: any;
    try {
      const cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`AI returned invalid JSON: ${content.slice(0, 200)}`);
    }

    const md = toMarkdown(parsed, company.name);

    const { error: updErr } = await supabase
      .from('crm_meeting_preps')
      .update({
        status: 'ready',
        generated_at: new Date().toISOString(),
        company_research: parsed.company_research ?? null,
        contact_profile: parsed.contact_profile ?? null,
        market_context: parsed.market_context ?? null,
        likely_pain_points: Array.isArray(parsed.likely_pain_points) ? parsed.likely_pain_points.join('\n') : (parsed.likely_pain_points ?? null),
        talking_points: Array.isArray(parsed.talking_points) ? parsed.talking_points.join('\n') : (parsed.talking_points ?? null),
        strategic_questions: Array.isArray(parsed.strategic_questions) ? parsed.strategic_questions.join('\n') : (parsed.strategic_questions ?? null),
        mundus_value_props: Array.isArray(parsed.mundus_value_props) ? parsed.mundus_value_props.join('\n') : (parsed.mundus_value_props ?? null),
        research_links: parsed.research_links ?? [],
        full_brief_md: md,
      })
      .eq('id', meeting_prep_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    try {
      const { meeting_prep_id } = await req.clone().json().catch(() => ({}));
      if (meeting_prep_id) {
        await supabase.from('crm_meeting_preps').update({ status: 'failed' }).eq('id', meeting_prep_id);
      }
    } catch {}
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});