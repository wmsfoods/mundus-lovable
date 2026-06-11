/**
 * Embedded Mundus fee helpers.
 *
 * When a supplier opts in (`mundus_fee_included = true`), the per-cut prices
 * the supplier typed are treated as NET. The platform grosses them up so the
 * 0.30% Mundus fee is paid out of the final price:
 *
 *     final = net / (1 - rate)     // so that  final - rate*final = net
 *
 * The grossed-up FINAL value is what gets persisted into offer_items.price /
 * minimum_price and is the only price ever shown to buyers. The original NET
 * values are stored on offers.net_prices (supplier-only) for the supplier's
 * own reference and to power Edit/Clone prefill.
 */

export const MUNDUS_FEE_RATE = 0.003; // 0.30 %

/** Gross up a NET price → FINAL price that already covers the Mundus fee. */
export function grossUpPrice(net: number, rate: number = MUNDUS_FEE_RATE): number {
  if (!(net > 0)) return 0;
  if (!(rate > 0) || rate >= 1) return net;
  return net / (1 - rate);
}

/** Recover the NET price the supplier originally typed from a stored FINAL. */
export function netFromFinal(final: number, rate: number = MUNDUS_FEE_RATE): number {
  if (!(final > 0)) return 0;
  if (!(rate > 0) || rate >= 1) return final;
  return final * (1 - rate);
}

/** Round to the platform's standard price precision (kg or lb → 2 decimals). */
export function roundPrice(v: number): number {
  return Math.round(v * 100) / 100;
}