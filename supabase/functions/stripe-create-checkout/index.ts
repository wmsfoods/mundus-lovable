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

const PRICE_MAP: Record<string, string | undefined> = {
  supplier_pro: Deno.env.get("STRIPE_PRICE_SUPPLIER_PRO"),
  buyer_pro: Deno.env.get("STRIPE_PRICE_BUYER_PRO"),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "unauthenticated" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const company_id = String(body.company_id ?? "");
    const plan = String(body.plan ?? "");
    const success_url = String(body.success_url ?? "");
    const cancel_url = String(body.cancel_url ?? "");
    if (!company_id || !plan || !success_url || !cancel_url) {
      return json({ error: "missing_params" }, 400);
    }
    if (!PRICE_MAP[plan]) return json({ error: "invalid_plan" }, 400);

    // Use service role to look up company + verify membership through family scope helpers
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve HQ root — subscription belongs to the family root company
    const { data: rootRow, error: rootErr } = await admin
      .rpc("company_family_root", { p_company_id: company_id });
    if (rootErr) return json({ error: "lookup_failed", detail: rootErr.message }, 500);
    const root_company_id = (rootRow as string) || company_id;

    // Verify user belongs to the family (any company in the family tree)
    const { data: famIds } = await admin.rpc("company_family_ids", { p_company_id: root_company_id });
    const familyIds: string[] = Array.isArray(famIds) ? famIds : [];
    const { data: membership } = await admin
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .in("company_id", familyIds.length ? familyIds : [root_company_id]);
    const isAdminRpc = await admin
      .from("company_users")
      .select("id, roles!inner(name)")
      .eq("user_id", user.id)
      .eq("roles.name", "mundus_admin")
      .maybeSingle();
    if ((!membership || membership.length === 0) && !isAdminRpc.data) {
      return json({ error: "not_in_company" }, 403);
    }

    // Look up or create Stripe customer
    const { data: existingSub } = await admin
      .from("company_subscriptions")
      .select("stripe_customer_id")
      .eq("company_id", root_company_id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id ?? null;
    // Validate the stored customer still exists in current Stripe mode (test vs live).
    // If we switched modes, the old customer ID won't be found — recreate it.
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as any)?.deleted) customerId = null;
      } catch (err: any) {
        if (err?.code === "resource_missing") {
          console.warn("stale stripe_customer_id, recreating", customerId);
          customerId = null;
        } else {
          throw err;
        }
      }
    }
    if (!customerId) {
      const { data: companyRow } = await admin
        .from("companies")
        .select("name, billing_email")
        .eq("id", root_company_id)
        .maybeSingle();
      const customer = await stripe.customers.create({
        email: (companyRow as any)?.billing_email ?? user.email ?? undefined,
        name: (companyRow as any)?.name ?? undefined,
        metadata: { company_id: root_company_id },
      });
      customerId = customer.id;
      // Pre-seed a row so portal works even before webhook fires
      await admin.from("company_subscriptions").upsert(
        {
          company_id: root_company_id,
          stripe_customer_id: customerId,
          plan,
          status: "inactive",
        },
        { onConflict: "company_id" },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId!,
      line_items: [{ price: PRICE_MAP[plan]!, quantity: 1 }],
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      metadata: { company_id: root_company_id, plan },
      subscription_data: { metadata: { company_id: root_company_id, plan } },
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("stripe-create-checkout error", e);
    return json({ error: "internal", detail: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}