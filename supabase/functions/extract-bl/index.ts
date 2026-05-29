// Bill of Lading extraction via Lovable AI Gateway (Gemini supports PDF + images)
import { requireUser } from "../_shared/auth.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = {
  type: "object",
  properties: {
    container_number: { type: ["string", "null"] },
    seal_number: { type: ["string", "null"] },
    bl_number: { type: ["string", "null"] },
    shipping_line: { type: ["string", "null"] },
    vessel_name: { type: ["string", "null"] },
    voyage_number: { type: ["string", "null"] },
    origin_port: { type: ["string", "null"] },
    destination_port: { type: ["string", "null"] },
    origin_country: { type: ["string", "null"] },
    destination_country: { type: ["string", "null"] },
    departed_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    arrived_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    shipper_name: { type: ["string", "null"] },
    consignee_name: { type: ["string", "null"] },
    notify_party: { type: ["string", "null"] },
    description_of_goods: { type: ["string", "null"] },
    gross_weight_kg: { type: ["number", "null"] },
    number_of_packages: { type: ["number", "null"] },
    package_type: { type: ["string", "null"] },
    freight_terms: { type: ["string", "null"] },
    place_of_receipt: { type: ["string", "null"] },
    place_of_delivery: { type: ["string", "null"] },
  },
  required: [],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are an expert at reading Bill of Lading (BL) shipping documents.
Extract structured shipment data accurately. Use null for any field not present.
- shipping_line MUST be one of: MSC, Maersk, CMA CGM, Hapag-Lloyd, ONE, Evergreen, COSCO, ZIM, Yang Ming, HMM, PIL, Other
- Format ports as "Name (CODE)" e.g. "Santos (BRSSZ)" when both name and UN/LOCODE are visible
- Dates must be ISO YYYY-MM-DD
- gross_weight_kg and number_of_packages must be numeric (no commas, no units)`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req);
  if (!auth.ok) {
    return new Response(auth.response.body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, mimeType } = await req.json();
    if (!fileBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: "fileBase64 and mimeType required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:${mimeType};base64,${fileBase64}`;

    const body = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all available shipment data from this Bill of Lading." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "submit_bl_data",
          description: "Submit extracted Bill of Lading data",
          parameters: SCHEMA,
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_bl_data" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gateway error", resp.status, t);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI credits required. Add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: Record<string, unknown> = {};
    if (call?.function?.arguments) {
      try { extracted = JSON.parse(call.function.arguments); } catch { extracted = {}; }
    } else {
      // Fallback: try plain text JSON
      const txt = json.choices?.[0]?.message?.content ?? "";
      const clean = String(txt).replace(/```json|```/g, "").trim();
      try { extracted = JSON.parse(clean); } catch { extracted = {}; }
    }

    return new Response(JSON.stringify({ extracted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-bl error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});