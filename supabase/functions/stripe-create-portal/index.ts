import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const company_id = String(body.company_id ?? "");
    const return_url = String(body.return_url ?? "");
    if (!company_id || !return_url) return json({ error: "missing_params" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: root } = await admin.rpc("company_family_root", { p_company_id: company_id });
    const rootId = (root as string) || company_id;

    const { data: sub } = await admin
      .from("company_subscriptions")
      .select("stripe_customer_id")
      .eq("company_id", rootId)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return json({ error: "no_customer" }, 404);

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url,
    });
    return json({ url: portal.url });
  } catch (e) {
    console.error("stripe-create-portal error", e);
    return json({ error: "internal", detail: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}