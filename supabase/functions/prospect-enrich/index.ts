// Apollo people/match enrichment — reveals email and (optionally) phone.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("apollo") ?? Deno.env.get("APOLLO_API_KEY");
  if (!apiKey) return json({ ok: false, error: "apollo_api_key_missing" });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }

  // Accepted: { id?, first_name?, last_name?, name?, organization_name?, domain?, email?, linkedin_url?, reveal_phone? }
  const payload: Record<string, unknown> = {
    reveal_personal_emails: true,
  };
  if (body.reveal_phone) {
    payload.reveal_phone_number = true;
    // Apollo requires a webhook to deliver phone numbers asynchronously.
    const supaUrl = Deno.env.get("SUPABASE_URL");
    if (supaUrl) {
      payload.webhook_url = `${supaUrl}/functions/v1/prospect-phone-webhook`;
    }
  }

  for (const k of ["id", "first_name", "last_name", "name", "organization_name", "domain", "email", "linkedin_url"]) {
    const v = (body as Record<string, unknown>)[k];
    if (v !== undefined && v !== null && v !== "") payload[k] = v;
  }

  try {
    const r = await fetch(`${APOLLO_BASE}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return json({
        ok: false,
        status: r.status,
        error_code: j?.error_code ?? null,
        error: j?.error ?? j?.message ?? "apollo_error",
        apollo: j,
      });
    }
    const person = j.person ?? j.matches?.[0] ?? null;
    const phoneNumbers: any[] = Array.isArray(person?.phone_numbers) ? person.phone_numbers : [];
    const directPhone = phoneNumbers.find((pn: any) => pn?.type === "work_direct" || pn?.type === "work_hq");
    const mobilePhone = phoneNumbers.find((pn: any) => pn?.type === "mobile");
    const anyPhone = phoneNumbers[0];
    return json({
      ok: true,
      person,
      apollo_person_id: person?.id ?? null,
      phone_pending: Boolean(body.reveal_phone),
      email: person?.email ?? null,
      phone: person?.sanitized_phone
        ?? directPhone?.sanitized_number
        ?? anyPhone?.sanitized_number
        ?? person?.organization?.phone
        ?? null,
      mobile: mobilePhone?.sanitized_number ?? person?.mobile_phone ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg });
  }
});