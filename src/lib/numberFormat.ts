/**
 * US number format helpers. Display: 1,234.56 (comma thousands, dot decimal).
 * Used by NumberInput / MoneyInput / QtyInput so the whole app shares one
 * numeric typing model.
 */

export function sanitizeNumericTyping(input: string, decimals: number): string {
  if (input == null) return "";
  // Accept comma as a decimal alias for users coming from BR/EU keyboards.
  let v = String(input).replace(/,/g, ".");
  // Strip anything that isn't a digit or a dot.
  v = v.replace(/[^\d.]/g, "");
  // Keep only the first dot.
  const i = v.indexOf(".");
  if (i !== -1) {
    v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
    if (decimals <= 0) {
      v = v.slice(0, i);
    } else {
      const [head, tail = ""] = v.split(".");
      v = head + "." + tail.slice(0, decimals);
    }
  }
  // Avoid leading-zero runs like "007" → "7" (but keep "0.x" and "0").
  if (/^0\d/.test(v)) v = v.replace(/^0+/, "");
  return v;
}

export function parseUS(s: string | number | null | undefined): number | null {
  if (s == null || s === "") return null;
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function formatUS(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Same value but without grouping commas — used as the seed when the field
 *  gains focus, so the caret behaves naturally for typing. */
export function formatPlain(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return "";
  const fixed = n.toFixed(decimals);
  // Trim trailing zeros and a dangling dot so typing "7" doesn't show "7.00".
  return fixed.replace(/\.?0+$/, "");
}