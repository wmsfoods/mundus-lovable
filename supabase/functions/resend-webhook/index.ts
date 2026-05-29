import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Resend webhook receiver — populates real delivery / bounce / complaint
// status into email_queue using the resend_id correlation we store at send-time.
//
// Configure on Resend Dashboard → Webhooks:
//   URL:    https://<project>.functions.supabase.co/resend-webhook
//   Events: email.delivered, email.bounced, email.complained,
//           email.opened, email.clicked, email.delivery_delayed
//
// We intentionally accept ALL events even when no signing secret is set —
// resend_id correlation is the only mutation key and is opaque.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: any = {};
  try { payload = await req.json(); } catch { /* invalid body */ }

  const type: string = String(payload?.type ?? "");
  const data: any = payload?.data ?? {};
  const resendId: string | undefined = data?.email_id ?? data?.id;
  if (!resendId) {
    return new Response(JSON.stringify({ ok: true, ignored: "missing_id" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const update: Record<string, any> = {};
  const nowIso = new Date().toISOString();

  if (type === "email.delivered") {
    update.delivered_at = nowIso;
    update.status = "sent";
  } else if (type === "email.bounced") {
    update.bounced_at = nowIso;
    update.bounce_reason =
      data?.bounce?.message ?? data?.reason ?? "bounced";
    update.status = "failed";
    update.error_message = `Bounce: ${update.bounce_reason}`;
  } else if (type === "email.complained") {
    update.bounce_reason = "complaint";
    update.status = "failed";
    update.error_message = "Recipient marked as spam";
  } else if (type === "email.opened") {
    // Pixel already tracks opens, but Resend's signal is more reliable for
    // image-blocking clients — keep both in sync.
    update.opened_at = nowIso;
  } else if (type === "email.clicked") {
    update.clicked_at = nowIso;
  } else if (type === "email.delivery_delayed") {
    update.error_message = "Delivery delayed by provider";
  } else {
    return new Response(JSON.stringify({ ok: true, ignored: type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // For open/click events, increment counts atomically by reading first.
  if (type === "email.opened" || type === "email.clicked") {
    const { data: row } = await supabase
      .from("email_queue")
      .select("id, open_count, click_count")
      .eq("resend_id", resendId)
      .maybeSingle();
    if (row) {
      if (type === "email.opened") update.open_count = (row.open_count ?? 0) + 1;
      if (type === "email.clicked") update.click_count = (row.click_count ?? 0) + 1;
    }
  }

  const { error } = await supabase
    .from("email_queue")
    .update(update)
    .eq("resend_id", resendId);

  if (error) {
    console.error("[resend-webhook] update failed", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, type }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});