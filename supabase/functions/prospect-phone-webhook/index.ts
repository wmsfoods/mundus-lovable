// Receives Apollo phone-reveal callbacks and caches the result in DB for polling.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey);

  let payload: any = {};
  try { payload = await req.json(); } catch { /* empty */ }

  // Apollo may post the person object directly or wrap it.
  const person = payload?.person ?? payload?.data?.person ?? payload;
  const apolloId = person?.id ?? payload?.id ?? null;
  if (!apolloId) {
    return new Response(JSON.stringify({ ok: false, error: "missing_person_id" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  const phone = person?.sanitized_phone ?? person?.phone_numbers?.[0]?.sanitized_number ?? null;
  const mobile = person?.mobile_phone ?? person?.phone_numbers?.find((p: any) => p?.type === "mobile")?.sanitized_number ?? null;

  await supabase.from("prospect_phone_reveals").upsert({
    apollo_person_id: String(apolloId),
    phone,
    mobile,
    raw: payload,
    updated_at: new Date().toISOString(),
  }, { onConflict: "apollo_person_id" });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});