/**
 * Centralized unit conversion — ALL kg ↔ lbs conversions go through this file.
 *
 * IMPORTANT: Storage is ALWAYS in kg. "lbs" is a display/input preference only.
 * Whenever the user types a value in lbs mode, convert to kg via `fromDisplay`
 * before persisting it to state/Supabase. Whenever you render a stored kg value,
 * pass it through `toDisplay` / `fmtWeight` / `fmtPrice`.
 *
 * TODO: When generating documents (Invoice, Packing List, Quote PDF),
 * use the BUYER's unit preference, not the viewer's. For US/CA buyers,
 * documents should default to lbs.
 */

export const KG_PER_LB = 0.45359237;       // NIST official
export const LB_PER_KG = 2.20462262185;

export type WeightUnit = "kg" | "lbs";

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const pricePerKgToPerLb = (p: number) => p * KG_PER_LB;
export const pricePerLbToPerKg = (p: number) => p * LB_PER_KG;

/** Convert a stored kg value to display unit. */
export function toDisplay(value: number, kind: "weight" | "price", unit: WeightUnit): number {
  if (unit === "kg") return value;
  return kind === "weight" ? kgToLb(value) : pricePerKgToPerLb(value);
}

/** Convert a user-entered display value back to kg for storage. */
export function fromDisplay(value: number, kind: "weight" | "price", unit: WeightUnit): number {
  if (unit === "kg") return value;
  return kind === "weight" ? lbToKg(value) : pricePerLbToPerKg(value);
}

/* ─── Labels ─── */
export const weightLabel = (unit: WeightUnit) => (unit === "kg" ? "kg" : "lb");
export const priceLabel = (unit: WeightUnit) => (unit === "kg" ? "$/kg" : "$/lb");
export const qtyLabel = (unit: WeightUnit) => (unit === "kg" ? "Qty (kg)" : "Qty (lb)");

/** Container capacities — always stored in kg. */
export function containerCapacityKg(size: "20ft" | "40ft") {
  return size === "40ft" ? 28000 : 14000;
}

/* ─── Formatters ─── */
export function fmtWeight(kg: number, unit: WeightUnit) {
  const v = toDisplay(kg, "weight", unit);
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function fmtPrice(pricePerKg: number, unit: WeightUnit, digits: number = 2) {
  const v = toDisplay(pricePerKg, "price", unit);
  return v.toFixed(digits);
}

/**
 * Negotiation-context formatter: in $/lb we display 3 decimals so small
 * per-kg movements (the engine moves in $/kg) stay visible to both sides.
 * In $/kg keep the regular 2 decimals.
 */
export function fmtPriceNego(pricePerKg: number, unit: WeightUnit) {
  return fmtPrice(pricePerKg, unit, unit === "lbs" ? 3 : 2);
}
export const negoPriceDigits = (unit: WeightUnit) => (unit === "lbs" ? 3 : 2);