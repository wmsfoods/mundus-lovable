/**
 * Formats an offer number for display.
 * @param offerNumber - The sequential integer offer number
 * @param createdAt - ISO date string of when the offer was created
 * @returns Formatted string like "M-000001-2026"
 */
export function formatOfferNumber(
  offerNumber: number | null | undefined,
  createdAt?: string | null,
): string {
  const num = offerNumber ?? 0;
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `M-${String(num).padStart(6, "0")}-${year}`;
}