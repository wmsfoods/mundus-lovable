#!/usr/bin/env node
/**
 * Generates the bilingual Notifications Catalog as:
 *   - /mnt/documents/email-previews/<template>.html  (one per template)
 *   - /mnt/documents/notifications-catalog.html      (navigable single page)
 *   - /mnt/documents/notifications-catalog.pdf       (printable)
 *
 * Uses the real emailTemplates.ts so previews match production exactly.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const OUT = "/mnt/documents";
const PREVIEWS = `${OUT}/email-previews`;
mkdirSync(PREVIEWS, { recursive: true });

// Dynamic ESM import of the TS module via tsx loader (already installed).
const { emailTemplates, emailSubjects, buildViaMundusEmail } = await import(
  resolve(root, "src/lib/emailTemplates.ts")
);
const { NOTIFICATIONS, SAMPLE_VARS, CHANNEL_LABELS, CATEGORY_LABELS } =
  await import(resolve(root, "src/data/notificationsCatalog.ts"));

// ---------- Render each email template ----------
const previewByTemplate = {};
for (const [name, fn] of Object.entries(emailTemplates)) {
  const vars = SAMPLE_VARS[name];
  if (!vars) continue;
  try {
    const html = fn(vars);
    const subject = emailSubjects[name] ? emailSubjects[name](vars) : "(no subject)";
    previewByTemplate[name] = { html, subject };
    writeFileSync(`${PREVIEWS}/${name}.html`, html);
  } catch (e) {
    console.error(`[preview] ${name} failed`, e.message);
  }
}
// Via-Mundus has its own builder
{
  const viaMundus = buildViaMundusEmail({
    senderName: "Carlos Lima",
    senderCompany: "JBS Brazil",
    recipientName: "Maria Souza",
    recipientCompany: "Souza Foods",
    subject: "Updated lead time on M-001245",
    body: "Hi Maria,\n\nWe can confirm Feb 18 loading. Please advise on advance payment.\n\nBest,\nCarlos",
    urgent: false,
    recordId: "M-001245",
    recordType: "negotiation",
    recordUrl: "https://app.mundustrade.us/buyer/negotiations/abc",
  });
  previewByTemplate.buildViaMundusEmail = { html: viaMundus.html, subject: viaMundus.subject };
  writeFileSync(`${PREVIEWS}/buildViaMundusEmail.html`, viaMundus.html);
}

// ---------- Build navigable HTML catalog ----------
const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function channelBadge(ch) {
  const c = { email: "#8B2252", in_app: "#0D9488", push: "#D97706" }[ch];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${c}15;color:${c};font-size:11px;font-weight:600;margin-right:4px;">${CHANNEL_LABELS[ch].en}</span>`;
}

function entryCard(n) {
  const previewHtml = n.emailTemplate && previewByTemplate[n.emailTemplate];
  const iframe = previewHtml
    ? `<details style="margin-top:14px;"><summary style="cursor:pointer;font-size:12px;color:#8B2252;font-weight:600;">▶ Preview do email (${esc(n.emailTemplate)})</summary>
        <iframe srcdoc="${esc(previewHtml.html)}" style="width:100%;height:720px;border:1px solid #E5E7EB;border-radius:8px;margin-top:8px;background:#fff"></iframe>
      </details>`
    : "";
  return `
  <section id="${esc(n.id)}" style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:18px;">
    <div style="display:flex;align-items:start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:0.6px;color:#8B2252;">${esc(CATEGORY_LABELS[n.category].pt)} · ${esc(CATEGORY_LABELS[n.category].en)}</div>
        <h2 style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1A1A2E;">${esc(n.name.pt)} <span style="color:#9CA3AF;font-weight:400;font-size:14px;">— ${esc(n.name.en)}</span></h2>
        <div style="font-size:11px;color:#9CA3AF;font-family:monospace;margin-top:2px;">id: ${esc(n.id)}</div>
      </div>
      <div>${n.channels.map(channelBadge).join("")}</div>
    </div>
    <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:13px;">
      <tr><td style="padding:6px 0;width:160px;color:#6B7280;vertical-align:top;">Gatilho · Trigger</td><td><b>PT:</b> ${esc(n.trigger.pt)}<br><b>EN:</b> ${esc(n.trigger.en)}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280;vertical-align:top;">Destinatários · Recipients</td><td><b>PT:</b> ${esc(n.recipients.pt)}<br><b>EN:</b> ${esc(n.recipients.en)}</td></tr>
      ${n.emailTemplate ? `<tr><td style="padding:6px 0;color:#6B7280;vertical-align:top;">Email subject</td><td><code style="background:#F3F4F6;padding:2px 6px;border-radius:4px;">${esc(n.emailSubject ?? "")}</code><br><span style="color:#9CA3AF;">template: <code>${esc(n.emailTemplate)}</code></span></td></tr>` : ""}
      ${n.inApp ? `<tr><td style="padding:6px 0;color:#6B7280;vertical-align:top;">Sino (in-app)</td><td><b>Title PT:</b> ${esc(n.inApp.title.pt)} · <b>EN:</b> ${esc(n.inApp.title.en)}<br><b>Body PT:</b> ${esc(n.inApp.body.pt)}<br><b>Body EN:</b> ${esc(n.inApp.body.en)}<br><span style="color:#9CA3AF;font-size:11px;">icon: ${esc(n.inApp.icon ?? "bell")} · link: <code>${esc(n.inApp.linkPattern ?? "—")}</code></span></td></tr>` : ""}
      ${n.push ? `<tr><td style="padding:6px 0;color:#6B7280;vertical-align:top;">Push</td><td><b>Title PT:</b> ${esc(n.push.title.pt)} · <b>EN:</b> ${esc(n.push.title.en)}<br><b>Body PT:</b> ${esc(n.push.body.pt)} · <b>EN:</b> ${esc(n.push.body.en)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#6B7280;vertical-align:top;">Origem (código)</td><td><ul style="margin:0;padding-left:18px;">${n.sources.map((s) => `<li><code style="font-size:12px;">${esc(s)}</code></li>`).join("")}</ul></td></tr>
      ${n.notes ? `<tr><td style="padding:6px 0;color:#6B7280;vertical-align:top;">Notas</td><td style="color:#92400E;background:#FEF3C7;padding:8px 10px;border-radius:6px;"><b>PT:</b> ${esc(n.notes.pt)}<br><b>EN:</b> ${esc(n.notes.en)}</td></tr>` : ""}
    </table>
    ${iframe}
  </section>`;
}

// Coverage matrix
const coverageRows = NOTIFICATIONS.map((n) => {
  const cell = (ch) => (n.channels.includes(ch)
    ? '<td style="text-align:center;color:#059669;font-weight:700;">✓</td>'
    : '<td style="text-align:center;color:#DC2626;">—</td>');
  return `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #F3F4F6;"><a href="#${n.id}" style="color:#8B2252;text-decoration:none;">${esc(n.name.en)}</a></td>
    <td style="padding:6px 10px;border-bottom:1px solid #F3F4F6;color:#6B7280;font-size:12px;">${esc(CATEGORY_LABELS[n.category].en)}</td>
    ${cell("email")}${cell("in_app")}${cell("push")}
  </tr>`;
}).join("");

// Gaps
const gaps = NOTIFICATIONS.filter((n) => n.channels.length < 3 && n.category !== "auth" && n.category !== "internal" && n.category !== "marketing");

// TOC
const toc = NOTIFICATIONS.map((n) =>
  `<li><a href="#${n.id}" style="color:#374151;text-decoration:none;display:block;padding:4px 8px;border-radius:6px;font-size:12.5px;">${esc(n.name.en)}</a></li>`
).join("");

const catalogHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Mundus Trade — Notifications Catalog</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#F9FAFB;color:#1A1A2E;}
  a:hover{background:#FDF2F7 !important;color:#8B2252 !important;}
  .layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh;}
  aside{background:#fff;border-right:1px solid #E5E7EB;padding:20px 12px;overflow-y:auto;position:sticky;top:0;height:100vh;}
  main{padding:28px 32px;max-width:1100px;}
  h1{font-size:24px;margin:0 0 4px;color:#8B2252;}
  table.coverage{width:100%;border-collapse:collapse;background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:24px;}
  table.coverage th{background:#F9FAFB;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;color:#6B7280;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;}
  code{font-family:ui-monospace,Menlo,monospace;font-size:12px;}
</style></head><body>
<div class="layout">
  <aside>
    <div style="font-weight:700;color:#8B2252;font-size:13px;margin-bottom:8px;">Notifications</div>
    <a href="#overview" style="display:block;padding:6px 8px;font-size:12.5px;color:#374151;text-decoration:none;border-radius:6px;">Visão geral</a>
    <a href="#coverage" style="display:block;padding:6px 8px;font-size:12.5px;color:#374151;text-decoration:none;border-radius:6px;">Cobertura por canal</a>
    <a href="#gaps" style="display:block;padding:6px 8px;font-size:12.5px;color:#374151;text-decoration:none;border-radius:6px;">Gaps</a>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:12px 4px;">
    <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:0.6px;padding:0 8px;">EVENTOS</div>
    <ul style="list-style:none;margin:6px 0;padding:0;">${toc}</ul>
  </aside>
  <main>
    <section id="overview">
      <h1>Mundus Trade — Notifications Catalog</h1>
      <p style="color:#6B7280;margin:6px 0 18px;">Bilingual (PT/EN) end-to-end catalog of every notification sent by the system across <b>Email</b>, <b>Bell (in-app)</b> and <b>Mobile Push</b>.</p>
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin-bottom:18px;font-size:13px;line-height:1.6;">
        <b>Arquitetura:</b><br>
        Evento → (email via <code>send-email</code> + <code>emailTemplates.ts</code>) · (sino via RPC <code>enqueue_app_notifications</code> → tabela <code>app_notifications</code> · realtime <code>useAppNotifications</code> + <code>NotificationBell</code>) · (push via trigger AFTER INSERT em <code>app_notifications</code> → edge fn <code>send-push</code> → FCM/APNs).
      </div>
    </section>
    <section id="coverage">
      <h2 style="font-size:18px;color:#1A1A2E;">Cobertura por canal</h2>
      <table class="coverage">
        <thead><tr><th>Evento</th><th>Categoria</th><th style="text-align:center;">Email</th><th style="text-align:center;">Sino</th><th style="text-align:center;">Push</th></tr></thead>
        <tbody>${coverageRows}</tbody>
      </table>
    </section>
    <section id="gaps">
      <h2 style="font-size:18px;color:#1A1A2E;">Gaps identificados</h2>
      <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;padding:14px 16px;color:#92400E;font-size:13.5px;line-height:1.6;">
        ${gaps.map((g) => {
          const missing = ["email", "in_app", "push"].filter((c) => !g.channels.includes(c));
          return `<div style="margin-bottom:8px;"><b>${esc(g.name.en)}</b> — falta: ${missing.map((m) => CHANNEL_LABELS[m].en).join(", ")}</div>`;
        }).join("")}
      </div>
    </section>
    <h2 style="font-size:18px;color:#1A1A2E;margin-top:32px;">Catálogo</h2>
    ${NOTIFICATIONS.map(entryCard).join("")}
    <p style="color:#9CA3AF;font-size:12px;margin-top:28px;">Gerado por <code>scripts/generate-notifications-catalog.mjs</code> · fonte: <code>src/data/notificationsCatalog.ts</code></p>
  </main>
</div></body></html>`;

writeFileSync(`${OUT}/notifications-catalog.html`, catalogHtml);
console.log(`✓ HTML catalog written to ${OUT}/notifications-catalog.html`);
console.log(`✓ ${Object.keys(previewByTemplate).length} email previews in ${PREVIEWS}/`);