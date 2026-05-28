import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const RESEND_KEY = Deno.env.get("resend_mundus") || Deno.env.get("RESEND_API_KEY");
  const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "notifications@mundustrade.us";
  const FROM_NAME = Deno.env.get("FROM_NAME") || "Mundus Trade";

  let body: { email_id?: string; mode?: string; limit?: number } = {};
  try { body = await req.json(); } catch { /* no body ok */ }

  try {
    let emails: any[] = [];
    if (body.email_id) {
      const { data } = await supabase
        .from("email_queue").select("*")
        .eq("id", body.email_id).eq("status", "queued").maybeSingle();
      if (data) emails = [data];
    } else {
      const { data } = await supabase
        .from("email_queue").select("*")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(body.limit ?? 20);
      emails = data ?? [];
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No emails to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!RESEND_KEY) {
      const ids = emails.map((e) => e.id);
      await supabase.from("email_queue").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: "DEV MODE: no email provider configured",
      }).in("id", ids);
      return new Response(JSON.stringify({
        ok: true, sent: emails.length, mode: "dev",
        message: "Marked as sent (no provider configured).",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0, failed = 0;
    for (const email of emails) {
      try {
        await supabase.from("email_queue").update({ status: "sending" }).eq("id", email.id);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [email.to_email],
            subject: email.subject,
            html: email.html_body,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Resend ${res.status}: ${err}`);
        }
        await supabase.from("email_queue").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
        }).eq("id", email.id);
        sent++;
      } catch (e: any) {
        await supabase.from("email_queue").update({
          status: "failed",
          error_message: e?.message ?? String(e),
        }).eq("id", email.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, total: emails.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});