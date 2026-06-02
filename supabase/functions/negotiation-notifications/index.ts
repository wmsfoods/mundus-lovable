import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_KEY =
  Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "Mundus Trade <noreply@mundustrade.com>";

const LOGO_BAR = `
  <div style="background:#ffffff;padding:24px 20px 16px;text-align:center;border:1px solid #e5e7eb;border-bottom:none;border-radius:0;">
    <img src="https://app.mundustrade.us/__l5e/assets-v1/1af4d767-6b52-4c67-91bb-59ee4e40da24/mundus-logo-email.png" alt="Mundus Trade" width="180" style="display:inline-block;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;" />
  </div>`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = Record<string, any>;

const templates: Record<string, (d: D) => { to: string; subject: string; html: string }> = {
  new_bid: (d) => ({
    to: d.supplier_email,
    subject: `New bid on ${d.offer_title} from ${d.buyer_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        ${LOGO_BAR}
        <div style="background:#8B2252;padding:20px;border-radius:0">
          <h1 style="color:white;margin:0;font-size:20px">New Bid Received</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p><strong>${d.buyer_name}</strong> placed a bid on your offer <strong>${d.offer_title}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f9fafb"><td style="padding:8px;border:1px solid #e5e7eb"><strong>Round</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${d.round} of ${d.max_rounds}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Bid Total</strong></td><td style="padding:8px;border:1px solid #e5e7eb">US$ ${d.bid_total}</td></tr>
            <tr style="background:#f9fafb"><td style="padding:8px;border:1px solid #e5e7eb"><strong>Your Asking</strong></td><td style="padding:8px;border:1px solid #e5e7eb">US$ ${d.asking_total}</td></tr>
          </table>
          <a href="${d.link}" style="display:inline-block;padding:12px 24px;background:#8B2252;color:white;text-decoration:none;border-radius:8px;font-weight:600">View & Respond →</a>
          <p style="color:#6b7280;font-size:13px;margin-top:16px">You have 24 hours to respond before this bid expires.</p>
        </div>
      </div>`,
  }),
  new_counter: (d) => ({
    to: d.buyer_email,
    subject: `Counter-offer on ${d.offer_title} from ${d.supplier_name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        ${LOGO_BAR}
        <div style="background:#8B2252;padding:20px;border-radius:0">
          <h1 style="color:white;margin:0;font-size:20px">Counter-Offer Received</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p><strong>${d.supplier_name}</strong> sent a counter-offer for <strong>${d.offer_title}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f9fafb"><td style="padding:8px;border:1px solid #e5e7eb"><strong>Round</strong></td><td style="padding:8px;border:1px solid #e5e7eb">${d.round} of ${d.max_rounds}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Counter Total</strong></td><td style="padding:8px;border:1px solid #e5e7eb">US$ ${d.counter_total}</td></tr>
          </table>
          <a href="${d.link}" style="display:inline-block;padding:12px 24px;background:#8B2252;color:white;text-decoration:none;border-radius:8px;font-weight:600">Review Counter-Offer →</a>
        </div>
      </div>`,
  }),
  bid_accepted: (d) => ({
    to: d.to_email,
    subject: `Deal closed: ${d.offer_title} — US$ ${d.total_value}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        ${LOGO_BAR}
        <div style="background:#15803d;padding:20px;border-radius:0">
          <h1 style="color:white;margin:0;font-size:20px">🎉 Deal Closed!</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p>Congratulations! The negotiation for <strong>${d.offer_title}</strong> has been successfully closed.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
            <div style="font-size:14px;color:#15803d">Agreed Value</div>
            <div style="font-size:28px;font-weight:700;color:#15803d">US$ ${d.total_value}</div>
          </div>
          <a href="${d.link}" style="display:inline-block;padding:12px 24px;background:#15803d;color:white;text-decoration:none;border-radius:8px;font-weight:600">View Order Details →</a>
        </div>
      </div>`,
  }),
  bid_rejected: (d) => ({
    to: d.buyer_email,
    subject: `Bid rejected: ${d.offer_title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        ${LOGO_BAR}
        <div style="background:#b91c1c;padding:20px;border-radius:0">
          <h1 style="color:white;margin:0;font-size:20px">Bid Rejected</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p>The supplier has rejected your bid for <strong>${d.offer_title}</strong>.</p>
          ${d.reason ? `<p style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;font-size:13px"><strong>Reason:</strong> ${d.reason}</p>` : ""}
          <p style="color:#6b7280;font-size:13px">In 24 hours you can restart negotiating this offer, if still available.</p>
          <a href="${d.marketplace_link}" style="display:inline-block;padding:12px 24px;background:#8B2252;color:white;text-decoration:none;border-radius:8px;font-weight:600">🔍 Check Similar Offers →</a>
        </div>
      </div>`,
  }),
  offer_withdrawn: (d) => ({
    to: d.buyer_email,
    subject: `Offer no longer available: ${d.offer_title}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        ${LOGO_BAR}
        <div style="background:#92400e;padding:20px;border-radius:0">
          <h1 style="color:white;margin:0;font-size:20px">Offer Withdrawn</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
          <p>The supplier has withdrawn offer <strong>${d.offer_title}</strong>.</p>
          <p style="color:#6b7280;font-size:13px">This may be because the product was sold or the offer was revised. We apologize for the inconvenience.</p>
          <a href="${d.marketplace_link}" style="display:inline-block;padding:12px 24px;background:#8B2252;color:white;text-decoration:none;border-radius:8px;font-weight:600">🔍 Check Similar Offers on Marketplace →</a>
        </div>
      </div>`,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(auth.response.body, { status: auth.response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { action, data } = await req.json();
    const tpl = templates[action];
    if (!tpl) {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { to, subject, html } = tpl(data ?? {});
    if (!to) {
      return new Response(JSON.stringify({ error: "Missing recipient" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    const body = await res.text();
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});