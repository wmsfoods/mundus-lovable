/**
 * Platform-wide price precision (single source of truth).
 *
 *   PER-UNIT prices (price/kg, price/lb) → 3 decimal places
 *   MONETARY totals (cargo value, freight cost, insurance, advance/balance,
 *   per-FCL value)                       → 2 decimal places
 *
 * The per-unit calculation base is always PER KG; the kg↔lb conversion in
 * `src/lib/units.ts` keeps full precision internally and the display layer
 * rounds to 3 decimals via `roundUnitPrice` / `fmtUnitPrice`.
 *
 * Totals are computed as quantity × unit_price (3 dec) and ONLY then rounded
 * to 2 decimals — never round the unit price first, then multiply.
 */

export const UNIT_PRICE_DECIMALS = 3 as const;
export const TOTAL_DECIMALS = 2 as const;

/** Round a per-unit price ($/kg or $/lb) to platform precision (3 dec). */
export function roundUnitPrice(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 1000) / 1000;
}

/** Round a monetary total to platform precision (2 dec). */
export function roundTotal(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

/** Format a per-unit price using the user's locale, fixed 3 decimals. */
export function fmtUnitPrice(v: number, locale?: string): string {
  if (!Number.isFinite(v)) return "";
  return v.toLocaleString(locale, {
    minimumFractionDigits: UNIT_PRICE_DECIMALS,
    maximumFractionDigits: UNIT_PRICE_DECIMALS,
  });
}

/** Format a monetary total using the user's locale, fixed 2 decimals. */
export function fmtTotal(v: number, locale?: string): string {
  if (!Number.isFinite(v)) return "";
  return v.toLocaleString(locale, {
    minimumFractionDigits: TOTAL_DECIMALS,
    maximumFractionDigits: TOTAL_DECIMALS,
  });
}