// Canonical public domain. Never use window.location.origin for shared
// links, auth redirects, or print/PDF URLs — the preview runs on
// *.lovableproject.com and would leak that brand into user-facing links.
export const PUBLIC_APP_URL = "https://app.mundustrade.us";

export function publicUrl(path: string = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_APP_URL}${p}`;
}