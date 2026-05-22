const TRACKING_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/email-tracking`;

export function getTrackingPixelUrl(trackingId: string): string {
  return `${TRACKING_BASE_URL}/open/${trackingId}.png`;
}

export function getTrackingLinkUrl(trackingId: string, url: string): string {
  return `${TRACKING_BASE_URL}/click/${trackingId}?url=${encodeURIComponent(url)}`;
}

export function injectTrackingPixel(html: string, trackingId: string): string {
  const pixel = `<img src="${getTrackingPixelUrl(trackingId)}" width="1" height="1" alt="" style="display:block" />`;
  if (html.includes("</body>")) return html.replace("</body>", `${pixel}</body>`);
  return html + pixel;
}

export function wrapLinksWithTracking(html: string, trackingId: string): string {
  return html.replace(/href=["']([^"']+)["']/g, (_m, url) => {
    if (url.startsWith("mailto:") || url.startsWith("#")) return `href="${url}"`;
    return `href="${getTrackingLinkUrl(trackingId, url)}"`;
  });
}