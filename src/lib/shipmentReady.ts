/**
 * Shipment Ready helpers — 3 modes (month / week / custom).
 *
 * Form state is a single string with a prefix:
 *   "month:2026-06"    — ISO year-month
 *   "week:2026-W25"    — ISO week
 *   "custom:End of June 2026"  — free text
 *
 * Legacy values without prefix (e.g. "2026-06") are treated as month mode.
 *
 * Storage:
 *   - offers.shipment_ready_raw text — the prefixed form value (full fidelity)
 *   - offers.shipment_month int, offers.shipment_year int — backward compat
 *     (best-effort: month/week → derived; custom → null,null)
 */

export type ShipmentMode = "month" | "week" | "custom";

export type ShipmentParts = {
  mode: ShipmentMode;
  monthIdx?: number; // 1..12
  year?: number;
  week?: number; // 1..53
  custom?: string;
};

const MONTH_KEYS = [
  "shipmentReady.months.jan",
  "shipmentReady.months.feb",
  "shipmentReady.months.mar",
  "shipmentReady.months.apr",
  "shipmentReady.months.may",
  "shipmentReady.months.jun",
  "shipmentReady.months.jul",
  "shipmentReady.months.aug",
  "shipmentReady.months.sep",
  "shipmentReady.months.oct",
  "shipmentReady.months.nov",
  "shipmentReady.months.dec",
];
const MONTH_FALLBACK = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type TFn = (key: string, opts?: any) => string;

/** Decode a form-state string into structured parts. */
export function decodeShipmentReady(value: string | null | undefined): ShipmentParts {
  const v = (value ?? "").trim();
  if (!v) return { mode: "month" };
  // Legacy "YYYY-MM"
  const legacy = /^(\d{4})-(\d{2})$/.exec(v);
  if (legacy) return { mode: "month", year: Number(legacy[1]), monthIdx: Number(legacy[2]) };

  if (v.startsWith("month:")) {
    const m = /^month:(\d{4})-(\d{2})$/.exec(v);
    if (m) return { mode: "month", year: Number(m[1]), monthIdx: Number(m[2]) };
    return { mode: "month" };
  }
  if (v.startsWith("week:")) {
    const m = /^week:(\d{4})-W(\d{1,2})$/.exec(v);
    if (m) return { mode: "week", year: Number(m[1]), week: Number(m[2]) };
    return { mode: "week" };
  }
  if (v.startsWith("custom:")) {
    return { mode: "custom", custom: v.slice("custom:".length) };
  }
  // Unknown shape → custom passthrough
  return { mode: "custom", custom: v };
}

/** Encode structured parts back to the form-state string. */
export function encodeShipmentReady(parts: ShipmentParts): string {
  switch (parts.mode) {
    case "month": {
      if (parts.year && parts.monthIdx) {
        return `month:${parts.year}-${String(parts.monthIdx).padStart(2, "0")}`;
      }
      return "";
    }
    case "week": {
      if (parts.year && parts.week) {
        return `week:${parts.year}-W${String(parts.week).padStart(2, "0")}`;
      }
      return "";
    }
    case "custom": {
      const c = (parts.custom ?? "").trim();
      return c ? `custom:${c}` : "";
    }
  }
}

/** Convenience: parse from a row that may have raw + month/year. */
export function parseShipmentReady(input: {
  raw?: string | null;
  month?: number | null;
  year?: number | null;
}): ShipmentParts {
  if (input.raw && input.raw.length > 0) return decodeShipmentReady(input.raw);
  if (input.month && input.year) {
    return { mode: "month", year: input.year, monthIdx: input.month };
  }
  return { mode: "month" };
}

function monthName(idx: number, t?: TFn): string {
  const i = Math.min(12, Math.max(1, idx)) - 1;
  if (t) {
    try {
      return t(MONTH_KEYS[i], { defaultValue: MONTH_FALLBACK[i] });
    } catch {
      // ignore
    }
  }
  return MONTH_FALLBACK[i];
}

/**
 * Human display ("Jun 2026", "Week 25, 2026", or custom text).
 * Reads raw first (full fidelity); falls back to month+year (legacy rows).
 */
export function formatShipmentReadyDisplay(
  input: { raw?: string | null; month?: number | null; year?: number | null },
  t?: TFn,
): string {
  const parts = parseShipmentReady(input);
  switch (parts.mode) {
    case "month": {
      if (parts.monthIdx && parts.year) {
        return `${monthName(parts.monthIdx, t)} ${parts.year}`;
      }
      return "—";
    }
    case "week": {
      if (parts.week && parts.year) {
        const label = t
          ? t("shipmentReady.weekLabel", {
              defaultValue: "Week {{w}}, {{y}}",
              w: parts.week,
              y: parts.year,
            })
          : `Week ${parts.week}, ${parts.year}`;
        return label;
      }
      return "—";
    }
    case "custom":
      return parts.custom || "—";
  }
}

/**
 * Best-effort derivation of (month, year) ints from a parts object,
 * used to keep the legacy `shipment_month`/`shipment_year` columns in sync.
 * Returns nulls for custom (full free text).
 */
export function deriveLegacyMonthYear(parts: ShipmentParts): {
  shipment_month: number | null;
  shipment_year: number | null;
} {
  if (parts.mode === "month") {
    if (parts.monthIdx && parts.year) {
      return { shipment_month: parts.monthIdx, shipment_year: parts.year };
    }
    return { shipment_month: null, shipment_year: null };
  }
  if (parts.mode === "week") {
    if (parts.week && parts.year) {
      // ISO week → Monday of that week → calendar month
      const simple = new Date(Date.UTC(parts.year, 0, 1 + (parts.week - 1) * 7));
      const dayOfWeek = simple.getUTCDay() || 7;
      const monday = new Date(simple);
      if (dayOfWeek <= 4) monday.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
      else monday.setUTCDate(simple.getUTCDate() + 8 - dayOfWeek);
      return {
        shipment_month: monday.getUTCMonth() + 1,
        shipment_year: monday.getUTCFullYear(),
      };
    }
    return { shipment_month: null, shipment_year: null };
  }
  return { shipment_month: null, shipment_year: null };
}