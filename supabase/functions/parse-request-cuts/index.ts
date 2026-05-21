import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { text?: string; category?: string; known_cuts?: string[] };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const text = (body.text ?? '').trim();
  if (!text) {
    return new Response(JSON.stringify({ error: 'empty_text' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const known = (body.known_cuts ?? []).slice(0, 200);
  const systemPrompt = `You extract meat-cut purchase requests from raw text or pasted spreadsheets.
Category context: ${body.category ?? 'Beef'}.
Known cut names available in the catalog: ${known.join(', ') || '(none provided)'}
Rules:
- Return one row per cut requested.
- "cut" must be a short product name. If a known cut matches, use that exact wording.
- "spec" is an optional weight range or descriptor (e.g. "7-9 lb", "frozen").
- "marbling" is one of: "Not specified", "Low", "Medium", "High", "Prime".
- "qty_kg" is the quantity in kilograms (number, no units). Convert lbs/tons if obvious.
- "target_price_per_kg" is the target USD price per kg (number) or null if not given.
- Skip header rows and totals. Return [] if nothing parseable.`;

  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'submit_cuts',
          description: 'Return the parsed cuts list.',
          parameters: {
            type: 'object',
            properties: {
              rows: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    cut: { type: 'string' },
                    spec: { type: 'string' },
                    marbling: { type: 'string', enum: ['Not specified', 'Low', 'Medium', 'High', 'Prime'] },
                    qty_kg: { type: 'number' },
                    target_price_per_kg: { type: ['number', 'null'] },
                  },
                  required: ['cut', 'qty_kg'],
                  additionalProperties: false,
                },
              },
            },
            required: ['rows'],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'submit_cuts' } },
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
    return new Response(JSON.stringify({ error: 'ai_error' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await aiResp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  let rows: unknown[] = [];
  if (call?.function?.arguments) {
    try {
      const args = JSON.parse(call.function.arguments);
      rows = Array.isArray(args.rows) ? args.rows : [];
    } catch (e) {
      console.error('Failed to parse tool args', e);
    }
  }

  return new Response(JSON.stringify({ rows }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
