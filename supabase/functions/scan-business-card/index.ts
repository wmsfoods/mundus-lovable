import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

const SYSTEM_PROMPT = `You extract contact information from business card images.
Return ONLY valid JSON with no markdown, no backticks, no commentary. Use this exact structure:
{
  "fullName": "Person's full name",
  "firstName": "First name",
  "lastName": "Last name",
  "jobTitle": "Job title or position",
  "company": "Company or organization name",
  "email": "email@example.com",
  "phone": "Phone number with country code",
  "mobile": "Mobile number if different from phone",
  "website": "Website URL with https:// prefix",
  "address": "Full street address",
  "city": "City",
  "state": "State or region",
  "country": "Country (full name in English)",
  "postalCode": "Postal/ZIP code",
  "linkedin": "LinkedIn URL if present",
  "fax": "Fax number if present"
}
Use null for any field not present on the card. Clean up phone numbers to include country code when inferrable from context.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(auth.response.body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "LOVABLE_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { image?: string; mediaType?: string } = {};
  try { body = await req.json(); } catch {}

  if (!body.image) {
    return new Response(JSON.stringify({ ok: false, error: "no_image" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mediaType = body.mediaType || "image/jpeg";
  const dataUrl = `data:${mediaType};base64,${body.image}`;

  try {
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all contact info from this business card. Return ONLY the JSON object." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ ok: false, error: "Rate limited, please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ ok: false, error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ ok: false, error: "ai_gateway_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await aiResp.json();
    const text: string = result?.choices?.[0]?.message?.content ?? "";

    let parsed: Record<string, unknown> | null = null;
    try {
      const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
      // Try to extract first JSON object if there is surrounding text
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : cleaned);
    } catch (e) {
      console.error("parse failed", e, text);
      return new Response(JSON.stringify({ ok: false, error: "parse_failed", raw: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-business-card error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});