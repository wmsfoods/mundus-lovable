// Absolute URLs to brand images used inside email HTML. Emails cannot use
// relative paths — they must be fetchable from any inbox. We point to the
// Lovable CDN through the production custom domain so the URL is stable
// regardless of how the project is deployed.
const BASE = "https://app.mundustrade.us";

// Full horizontal logo (PNG with transparent background) — used in the
// header of every transactional email.
export const EMAIL_LOGO_FULL_URL =
  `${BASE}/__l5e/assets-v1/644ac36c-007b-4973-85c3-59c7a03a1b38/mundus-logo-email-full.png`;

// Square rounded app icon (PNG with transparent background) — fallback
// for small surfaces, dark mode, footer, etc.
export const EMAIL_LOGO_ICON_URL =
  `${BASE}/__l5e/assets-v1/44a57340-3dd8-4a67-8f57-27fc4816b323/mundus-logo-email-icon.png`;