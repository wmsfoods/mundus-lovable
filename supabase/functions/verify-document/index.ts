import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileBase64, fileType, companyName, taxId, registrationCountry } = await req.json();

    if (!fileBase64 || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing file or API key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a document verification specialist for a B2B meat trading platform called Mundus Trade. Analyze this business document (certificate, license, or registration document) and extract:

1. Document type (e.g., Business License, Certificate of Incorporation, Tax Registration, CNPJ Card, Trade License)
2. Company/Business name as written
3. Registration/Tax ID number as written
4. Country of registration (if identifiable)
5. Validity/expiration date (if present)

Compare with the user's submitted data:
- Company Name: "${companyName || "Not provided"}"
- Tax ID: "${taxId || "Not provided"}"
- Country: "${registrationCountry || "Not provided"}"

Respond in JSON ONLY (no markdown, no backticks):
{
  "documentType": "string",
  "extractedCompanyName": "string or null",
  "extractedTaxId": "string or null",
  "extractedCountry": "string or null",
  "expirationDate": "string or null",
  "isBusinessDocument": true,
  "companyNameMatch": "match",
  "taxIdMatch": "match",
  "countryMatch": "match",
  "overallVerification": "verified",
  "confidence": 0.0,
  "notes": "string"
}`;

    if (fileType === "application/pdf") {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "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";
      if (!ANTHROPIC_API_KEY) {
        return new Response(
          JSON.stringify({
            isBusinessDocument: true,
            overallVerification: "error",
            confidence: 0,
            notes: "PDF analysis not configured. Will be reviewed manually.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        console.error("[VERIFY-DOC] Claude API error:", claudeRes.status, errText);
        return new Response(
          JSON.stringify({
            overallVerification: "error",
            confidence: 0,
            notes: "PDF analysis failed. Will be reviewed manually.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const claudeData = await claudeRes.json();
      const claudeText: string = claudeData.content?.[0]?.text || "";

      let pdfResult;
      try {
        const clean = claudeText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        pdfResult = JSON.parse(clean);
      } catch {
        console.error("[VERIFY-DOC] Parse fail:", claudeText);
        pdfResult = {
          isBusinessDocument: false,
          overallVerification: "error",
          confidence: 0,
          notes: "Could not analyze PDF document",
        };
      }

      return new Response(JSON.stringify(pdfResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mediaType = "image/jpeg";
    if (fileType === "image/png") mediaType = "image/png";
    else if (fileType === "image/jpeg" || fileType === "image/jpg") mediaType = "image/jpeg";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${fileBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[VERIFY-DOC] AI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ overallVerification: "error", notes: "Rate limited" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ overallVerification: "error", notes: "AI credits exhausted" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const text: string = aiData.choices?.[0]?.message?.content || "";

    let result;
    try {
      const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(clean);
    } catch {
      console.error("[VERIFY-DOC] Parse fail:", text);
      result = { isBusinessDocument: false, overallVerification: "error", confidence: 0, notes: "Could not analyze document" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[VERIFY-DOC] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
