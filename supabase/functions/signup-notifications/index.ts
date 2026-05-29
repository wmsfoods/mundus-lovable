import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY =
  Deno.env.get("RESEND_API_KEY") || "re_APWMMN9H_PjbBKigYBDSgpnXXpcVdiArZ";
const FROM = "Mundus Trade <noreply@mundustrade.com>";
const ADMIN_EMAIL = "fn@mundustrade.com";
const WINE = "#8B2252";
const PLATFORM_URL = "https://mundustrade.com";

const logoHeader = `
  <div style="background:${WINE};padding:24px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;font-family:Georgia,serif;font-size:28px;margin:0;letter-spacing:1px;">MUNDUS TRADE</h1>
    <p style="color:#f3d9e0;font-size:12px;margin:4px 0 0;letter-spacing:2px;">INTERNATIONAL MEAT TRADING</p>
  </div>`;

const footer = `
  <div style="padding:24px;text-align:center;border-top:1px solid #eee;margin-top:24px;">
    <p style="color:#777;font-size:12px;margin:4px 0;">If you have any questions, contact us at <a href="mailto:support@mundustrade.com" style="color:${WINE};">support@mundustrade.com</a></p>
    <p style="color:#999;font-size:11px;margin:8px 0 0;">Mundus Trade · International Meat Trading Platform</p>
  </div>`;

function wrap(content: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.05);">
      ${logoHeader}
      <div style="padding:32px 28px;color:#333;font-size:15px;line-height:1.6;">
        ${content}
      </div>
      ${footer}
    </div></body></html>`;
}

function btn(label: string, url: string) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="background:${WINE};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;display:inline-block;">${label}</a>
  </div>`;
}

function userConfirmationHtml(userName: string, companyName: string) {
  return wrap(`
    <h2 style="color:${WINE};font-size:24px;margin:0 0 16px;">Registration Completed</h2>
    <p>Thank you for registering, <strong>${userName}</strong>.</p>
    <p>Your submission is under review, and you will receive an email with the result once the process is complete.</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;width:80px;height:60px;border:3px solid ${WINE};border-radius:6px;position:relative;">
        <div style="position:absolute;top:-3px;left:-3px;width:0;height:0;border-left:43px solid transparent;border-right:43px solid transparent;border-top:30px solid ${WINE};"></div>
      </div>
      <p style="color:${WINE};font-weight:bold;margin:12px 0 0;">📬 Awaiting Review</p>
    </div>
    <p style="background:#faf3f5;padding:12px 16px;border-left:3px solid ${WINE};border-radius:4px;"><strong>Company:</strong> ${companyName}</p>
  `);
}

function adminNotificationHtml(d: {
  userName: string;
  userEmail: string;
  companyName: string;
  role: string;
  registrationCountry: string;
  taxId: string;
}) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:10px 14px;background:#faf3f5;font-weight:bold;color:${WINE};width:140px;">${k}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;">${v || "—"}</td></tr>`;
  return wrap(`
    <h2 style="color:${WINE};font-size:22px;margin:0 0 16px;">Team Member Access Request</h2>
    <p>Hello,</p>
    <p>You have received a new request to approve a user who wants to join Mundus Trade 👥</p>
    <p>To proceed, please log in to the platform and review the user's information.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      ${row("Name", d.userName)}
      ${row("Email", d.userEmail)}
      ${row("Company", d.companyName)}
      ${row("Role", d.role)}
      ${row("Country", d.registrationCountry)}
      ${row("Tax ID", d.taxId)}
    </table>
    ${btn("Review Request", `${PLATFORM_URL}/admin/user-requests`)}
    <p style="font-weight:bold;color:${WINE};">This request will remain pending until you take action.</p>
    <p>If you have any questions, reply to this email or contact us at <a href="mailto:support@mundustrade.com" style="color:${WINE};">support@mundustrade.com</a></p>
    <p style="margin-top:24px;">Best regards,<br/><strong>Mundus Team</strong></p>
  `);
}

function approvalHtml(userName: string) {
  return wrap(`
    <h2 style="color:${WINE};font-size:24px;margin:0 0 16px;">Account Approved!</h2>
    <p>Congratulations, <strong>${userName}</strong>! 🎉</p>
    <p>Your account has been approved and you now have full access to the Mundus Trade platform.</p>
    <p>You can start exploring offers, managing your products, and connecting with buyers/suppliers worldwide.</p>
    ${btn("Access Platform", `${PLATFORM_URL}/login`)}
  `);
}

function rejectionHtml(userName: string) {
  return wrap(`
    <h2 style="color:${WINE};font-size:24px;margin:0 0 16px;">Registration Update</h2>
    <p>Hello ${userName},</p>
    <p>After reviewing your registration, we were unable to approve your account at this time.</p>
    <p>If you believe this was an error or would like to provide additional documentation, please contact us at <a href="mailto:support@mundustrade.com" style="color:${WINE};">support@mundustrade.com</a></p>
  `);
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error: ${res.status} ${txt}`);
  }
  return res.json();
}

// Logs a copy of every signup-related e-mail into `email_queue` so it
// appears in the Admin → Email Activity dashboard. Best-effort; never
// blocks the actual send.
async function logToQueue(opts: {
  to: string;
  subject: string;
  html: string;
  template: string;
  vars: Record<string, unknown>;
  resendId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const sb = createClient(url, key);
    await sb.from("email_queue").insert({
      to_email: opts.to,
      subject: opts.subject,
      html_body: opts.html,
      template_name: opts.template,
      template_vars: opts.vars,
      status: opts.errorMessage ? "failed" : "sent",
      sent_at: opts.errorMessage ? null : new Date().toISOString(),
      error_message: opts.errorMessage ?? null,
      resend_id: opts.resendId ?? null,
    });
  } catch (e) {
    console.warn("[signup-notifications] logToQueue failed", e);
  }
}

async function sendAndLog(
  to: string,
  subject: string,
  html: string,
  template: string,
  vars: Record<string, unknown>,
) {
  try {
    const r = await sendEmail(to, subject, html);
    const resendId = (r as any)?.id ?? (r as any)?.data?.id ?? null;
    await logToQueue({ to, subject, html, template, vars, resendId });
    return r;
  } catch (e) {
    await logToQueue({
      to, subject, html, template, vars,
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "user_confirmation") {
      const { userEmail, userName, companyName } = body;
      await sendAndLog(
        userEmail,
        "Welcome to Mundus Trade — Registration Received",
        userConfirmationHtml(userName || "", companyName || ""),
        "signupConfirmation",
        { userName, companyName },
      );
    } else if (action === "admin_notification") {
      const { userEmail, userName, companyName, role, registrationCountry, taxId } = body;
      await sendAndLog(
        ADMIN_EMAIL,
        `🔔 New User Registration — ${companyName || userName}`,
        adminNotificationHtml({
          userName: userName || "",
          userEmail: userEmail || "",
          companyName: companyName || "",
          role: role || "",
          registrationCountry: registrationCountry || "",
          taxId: taxId || "",
        }),
        "signupAdminNotification",
        { userName, userEmail, companyName, role, registrationCountry, taxId },
      );
    } else if (action === "approval") {
      const { userEmail, userName } = body;
      await sendAndLog(
        userEmail,
        "✅ Your Mundus Trade Account Has Been Approved!",
        approvalHtml(userName || ""),
        "signupApproved",
        { userName },
      );
    } else if (action === "rejection") {
      const { userEmail, userName } = body;
      await sendAndLog(
        userEmail,
        "Mundus Trade — Registration Update",
        rejectionHtml(userName || ""),
        "signupRejected",
        { userName },
      );
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[signup-notifications]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});