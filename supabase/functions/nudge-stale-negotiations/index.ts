import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/auth.ts";
import { insertAppNotificationForCompany } from "../_shared/appNotificationInsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireAdmin(req);
  if (!auth.ok) return new Response(auth.response.body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - 48 * 3600000).toISOString();
  const { data: stale } = await supabase
    .from("negotiations")
    .select("id, status, offer_id, buyer_company_id, updated_at, offers(offer_number, supplier_id, category)")
    .is("deleted_at", null)
    .not("status", "in", "(bid_accepted,offer_rejected,expired,offer_withdrawn)")
    .lt("updated_at", cutoff);

  let nudged = 0;
  for (const neg of (stale ?? []) as any[]) {
    const offer = neg.offers;
    if (!offer) continue;
    const target = neg.status === "pending_buyer_review" ? neg.buyer_company_id : offer.supplier_id;

    // first contact email for that company
    const { data: u } = await supabase
      .from("users").select("email, full_name")
      .or(`company_id.eq.${target},active_company_id.eq.${target}`)
      .limit(1).maybeSingle();
    if (!u?.email) continue;

    const sinceNudge = new Date(Date.now() - 24 * 3600000).toISOString();
    const { data: recent } = await supabase
      .from("email_queue").select("id")
      .eq("template_name", "staleNudge").eq("to_email", u.email)
      .gte("created_at", sinceNudge).limit(1);
    if (recent && recent.length > 0) continue;

    const hours = Math.round((Date.now() - new Date(neg.updated_at).getTime()) / 3600000);
    await supabase.from("email_queue").insert({
      to_email: u.email,
      subject: `⏰ Negotiation waiting — M-${offer.offer_number}`,
      html_body: `<p>Hi ${u.full_name ?? "there"}, negotiation M-${offer.offer_number} has been waiting for ${hours}h. Please review.</p>`,
      template_name: "staleNudge",
      template_vars: { offerNumber: offer.offer_number, hours },
      status: "queued",
    });

    const link =
      neg.status === "pending_buyer_review"
        ? `/buyer/negotiations/${neg.id}`
        : `/supplier/negotiations/${neg.id}`;
    await insertAppNotificationForCompany(supabase, target, {
      title: `Negotiation waiting — M-${offer.offer_number}`,
      body: `No activity for ${hours}h. Please review.`,
      icon: "alert",
      category: "negotiations",
      linkUrl: link,
      relatedType: "negotiation",
      relatedId: neg.id,
    });

    nudged++;
  }

  if (nudged > 0) {
    await supabase.functions.invoke("send-email", { body: { mode: "batch" } });
  }

  return new Response(JSON.stringify({ ok: true, nudged }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});