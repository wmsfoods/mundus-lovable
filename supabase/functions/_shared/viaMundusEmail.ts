// Shared edge-function copy of the "Message via Mundus" email builder.
// Mirrors the implementation in src/lib/emailTemplates.ts (buildViaMundusEmail).
// Kept here because edge functions cannot import from /src.

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function nl2br(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, "<br/>");
}
function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function buildViaMundusEmail(opts: {
  senderName: string;
  senderCompany: string;
  recipientName: string;
  recipientCompany: string;
  subject: string;
  body: string;
  urgent: boolean;
  recordId: string;
  recordType: "negotiation" | "order" | "sale";
  recordUrl: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSizeBytes?: number;
}): { subject: string; html: string; text: string } {
  const subjectLine = `${opts.urgent ? "⚡ " : ""}${opts.subject}`;
  const recordLabel =
    opts.recordType === "order"
      ? "Order"
      : opts.recordType === "sale"
        ? "Sale"
        : "Negotiation";

  const urgentBadge = opts.urgent
    ? `<span style="display:inline-block;background:#FEE2E2;color:#991B1B;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 8px;border-radius:4px;margin-right:8px;vertical-align:middle;">URGENT</span>`
    : "";

  const attachmentBlock = opts.attachmentUrl
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
      <tr><td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1A2E;">
        📎 <a href="${escapeHtml(opts.attachmentUrl)}" target="_blank" style="color:#8B2252;font-weight:600;text-decoration:none;">${escapeHtml(opts.attachmentName ?? "Attachment")}</a>
        ${opts.attachmentSizeBytes ? `<span style="color:#6B7280;font-size:12px;margin-left:8px;">(${formatBytes(opts.attachmentSizeBytes)})</span>` : ""}
      </td></tr>
    </table>`
    : "";

  const heroColor = opts.urgent
    ? "background: linear-gradient(135deg, #92400E, #D97706);"
    : "background: linear-gradient(135deg, #6C0B28, #A74764);";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F4F4F7;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:20px 32px;border-bottom:1px solid #F3F4F6;">
          <img src="https://app.mundustrade.us/favicon.png" alt="Mundus Trade" width="36" height="36" style="display:inline-block;vertical-align:middle;border:0;">
          <span style="font-size:18px;font-weight:700;color:#8B2252;vertical-align:middle;margin-left:8px;">Mundus</span>
          <span style="font-size:10px;font-weight:600;color:#A74764;vertical-align:middle;letter-spacing:2px;margin-left:2px;">TRADE</span>
        </td></tr>
        <tr><td style="${heroColor} padding:24px 32px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(opts.subject)}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="font-size:15px;line-height:1.6;color:#1A1A2E;">
            <p style="margin:0 0 8px;color:#6B7280;font-size:13px;">${urgentBadge}<span style="vertical-align:middle;">Sent via Mundus · ${recordLabel} <strong>${escapeHtml(opts.recordId)}</strong></span></p>
            <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(opts.recipientName || opts.recipientCompany)}</strong>,</p>
            <div style="margin:0 0 16px;">${nl2br(opts.body)}</div>
            ${attachmentBlock}
            <p style="margin:20px 0 0;color:#6B7280;font-size:13px;">From <strong>${escapeHtml(opts.senderName)}</strong> (${escapeHtml(opts.senderCompany)}) — sent via Mundus on your behalf.</p>
            <p style="margin:16px 0 0;color:#9CA3AF;font-size:12px;line-height:1.5;">Both parties were copied on this email. Replies to this address are not tracked. Continue the conversation in Mundus.</p>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
            <tr><td align="center">
              <a href="${escapeHtml(opts.recordUrl)}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:#8B2252;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">View ${recordLabel.toLowerCase()} in Mundus →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #F3F4F6;background-color:#FAFAFA;text-align:center;font-size:12px;color:#9CA3AF;line-height:1.6;">
          <p style="margin:0 0 8px;">Mundus Trade LLC · Ocoee, FL — United States</p>
          <p style="margin:0;"><a href="https://app.mundustrade.us" style="color:#8B2252;text-decoration:none;">app.mundustrade.us</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Subject: ${opts.subject}`,
    `From: ${opts.senderName} (${opts.senderCompany}) via Mundus`,
    `To: ${opts.recipientName} (${opts.recipientCompany})`,
    opts.urgent ? "Priority: URGENT" : "",
    "",
    opts.body,
    "",
    opts.attachmentUrl
      ? `Attachment: ${opts.attachmentName ?? "file"} — ${opts.attachmentUrl}`
      : "",
    "",
    `View in Mundus: ${opts.recordUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: subjectLine, html, text };
}