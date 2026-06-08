import { renderTemplate } from "./templateEngine";
import { EMAIL_LOGO_FULL_URL } from "./brandAssets";

export interface WelcomeOverrides {
  subject?: string;
  preheader?: string;
  heroTitle?: string;
  greeting?: string;
  intro?: string;
  nextStepsTitle?: string;
  step1?: string;
  step2?: string;
  step3?: string;
  step4?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  primaryColor?: string;
  logoUrl?: string;
}

export interface WelcomeVars {
  name: string;
  company: string;
  email: string;
  role: string;
  country: string;
  countryFlag: string;
}

/**
 * Renders the welcome email from an overrides object (admin-edited values).
 * Layout is fixed (table-based, email-client-safe); only texts/colors/logo
 * come from `o`. Interpolates {{name}} etc from `vars`.
 */
export function renderWelcomeFromOverrides(o: WelcomeOverrides, vars: WelcomeVars): { subject: string; html: string } {
  const v: Record<string, string> = {
    name: vars.name,
    company: vars.company,
    email: vars.email,
    role: vars.role,
    country: vars.country,
    countryFlag: vars.countryFlag,
  };
  const t = (s: string | undefined) => (s ? renderTemplate(s, v) : "");
  const primary = o.primaryColor || "#8B2252";
  const logo = o.logoUrl || EMAIL_LOGO_FULL_URL;
  const subject = t(o.subject) || "Welcome to Mundus Trade";
  const preheader = t(o.preheader);
  const heroTitle = t(o.heroTitle) || "Welcome to Mundus Trade";
  const greeting = t(o.greeting) || `Hi ${vars.name},`;
  const intro = t(o.intro);
  const nextStepsTitle = t(o.nextStepsTitle);
  const steps = [o.step1, o.step2, o.step3, o.step4].map(t).filter(Boolean);
  const ctaLabel = t(o.ctaLabel);
  const ctaUrl = t(o.ctaUrl);

  const dataRows = [
    { label: "Company", value: vars.company, bold: true },
    { label: "Email", value: vars.email },
    { label: "Role", value: vars.role },
    { label: "Country", value: `${vars.countryFlag} ${vars.country}` },
  ];
  const dataCard = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
      ${dataRows.map(r => `
        <tr>
          <td style="padding:8px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;width:40%;border-bottom:1px solid #F3F4F6;">${r.label}</td>
          <td style="padding:8px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1A2E;${r.bold ? 'font-weight:700;' : ''}border-bottom:1px solid #F3F4F6;">${r.value}</td>
        </tr>`).join("")}
    </table>`;

  const stepsHtml = nextStepsTitle || steps.length
    ? `<p style="margin:20px 0 8px;font-weight:600;">${nextStepsTitle}</p>${steps.map(s => `<p style="margin:0 0 4px;">${s}</p>`).join("")}`
    : "";

  const ctaHtml = ctaUrl && ctaLabel ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
      <tr><td align="center">
        <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:${primary};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${ctaLabel}</a>
      </td></tr>
    </table>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${heroTitle}</title>
${preheader ? `<span style="display:none;max-height:0;overflow:hidden">${preheader}</span>` : ""}
<style>@media only screen and (max-width:600px){.email-container{width:100%!important}.content-padding{padding:24px 16px!important}.hero-padding{padding:20px 16px!important}}</style>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F7;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F4F4F7;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <tr><td style="padding:20px 32px;border-bottom:1px solid #F3F4F6;">
        <img src="${logo}" alt="Mundus Trade" height="32" style="display:block;height:32px;width:auto;border:0;outline:none;text-decoration:none;">
      </td></tr>
      <tr><td style="background:linear-gradient(135deg,${primary},#A74764);padding:24px 32px;" class="hero-padding">
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${heroTitle}</h1>
      </td></tr>
      <tr><td style="padding:32px;" class="content-padding">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1A1A2E;">
          <p style="margin:0 0 16px;">${greeting}</p>
          ${intro ? `<p style="margin:0 0 16px;">${intro}</p>` : ""}
          ${dataCard}
          ${stepsHtml}
        </div>
        ${ctaHtml}
      </td></tr>
      <tr><td style="padding:24px 32px;border-top:1px solid #F3F4F6;background-color:#FAFAFA;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.6;">
        <p style="margin:0 0 8px;">Mundus Trade LLC · Ocoee, FL — United States</p>
        <p style="margin:0;"><a href="https://app.mundustrade.us" style="color:${primary};text-decoration:none;">app.mundustrade.us</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  return { subject, html };
}