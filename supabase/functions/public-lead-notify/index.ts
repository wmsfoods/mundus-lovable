import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "fn@mundustrade.com";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

function renderHtml(p: Record<string, string | undefined>): string {
  const row = (k: string, v?: string) =>
    `<tr><td style="padding:6px 12px;border:1px solid #eee;background:#fafafa;font-weight:600;">${k}</td><td style="padding:6px 12px;border:1px solid #eee;">${escapeHtml(v || "—")}</td></tr>`;
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#1a1a2e;">
    <h2 style="color:#8B2252;">New public-home lead 🌎</h2>
    <p>A new lead was captured on the public homepage. Please follow up within 1 business day.</p>
    <table style="border-collapse:collapse;border:1px solid #eee;font-size:14px;">
      ${row("Email", p.email)}
      ${row("Name", p.name)}
      ${row("Company", p.company)}
      ${row("Phone", p.phone)}
      ${row("Country", p.country)}
      ${row("Interest (protein)", p.protein)}
      ${row("Lead type", p.lead_type)}
      ${row("Assigned Mundus rep", p.mundus_rep)}
      ${row("Language", p.lang || "en")}
    </table>
    <p style="margin-top:24px;"><a href="https://app.mundustrade.us/admin/crm/prospects">Open CRM →</a></p>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const vars = {
      email,
      name: body?.name,
      company: body?.company,
      phone: body?.phone,
      country: body?.country,
      protein: body?.protein,
      lead_type: body?.lead_type,
      mundus_rep: body?.mundus_rep,
      lang: body?.lang,
    };
    const subject = `New public-home lead — ${email}`;
    const html = renderHtml(vars);

    // Insert directly with service role (bypasses enqueue_email's auth.uid() check
    // since this function is invoked anonymously from the public homepage).
    const { data: inserted, error } = await supabase
      .from("email_queue")
      .insert({
        to_email: ADMIN_EMAIL,
        subject,
        html_body: html,
        template_name: "publicLeadCaptured",
        template_vars: vars,
        status: "queued",
      })
      .select("id")
      .single();
    if (error) throw error;
    const newId = inserted?.id;

    // Fire-and-forget dispatch
    if (newId) {
      supabase.functions.invoke("send-email", { body: { email_id: newId } }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});