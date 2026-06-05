import { useTranslation } from "react-i18next";
import { containerCapacityKg, fmtWeight, weightLabel, type WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

type Props = {
  usedKg: number;
  containerSize: "20ft" | "40ft";
  unit: WeightUnit;
};

/**
 * Capacity for ONE container. Per Mundus business rule, "full = good" so the
 * thresholds are inverted from a typical resource meter:
 *   0–70  → neutral (underutilized)
 *   70–95 → amber (almost full)
 *   95–100 → green (optimally filled)
 *   >100  → red (over capacity)
 */
export function CapacityBar({ usedKg, containerSize, unit }: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.cutsTable.capacity.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const capKg = containerCapacityKg(containerSize);
  const pct = capKg > 0 ? (usedKg / capKg) * 100 : 0;
  const clamped = Math.min(pct, 100);
  const over = pct > 100;

  const state: "empty" | "low" | "almost" | "full" | "over" =
    usedKg <= 0 ? "empty" :
    over ? "over" :
    pct >= 95 ? "full" :
    pct >= 70 ? "almost" : "low";

  const stateMsg: Record<typeof state, string> = {
    empty: tk("stateEmpty", "Add cuts to start filling the container"),
    low: tk("stateLow", "Underutilized — add more cuts"),
    almost: tk("stateAlmost", "Almost full"),
    full: tk("stateFull", "Container optimally filled"),
    over: tk("stateOver", "Over capacity — exceeds container limit"),
  };

  const barColor =
    state === "over" ? "bg-red-500" :
    state === "full" ? "bg-green-500" :
    state === "almost" ? "bg-amber-500" :
    state === "low" ? "bg-muted-foreground/40" :
    "bg-muted-foreground/20";

  const labelColor =
    state === "over" ? "text-red-600" :
    state === "full" ? "text-green-700" :
    state === "almost" ? "text-amber-700" :
    "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">
          {tk("title", "Container capacity")}{" "}
          <span className="text-muted-foreground">({containerSize})</span>
        </span>
        <span className={cn("font-semibold tabular-nums", labelColor)}>
          {fmtWeight(usedKg, unit)} / {fmtWeight(capKg, unit)} {weightLabel(unit)}
          <span className="ml-1">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 transition-all", barColor)}
          style={{ width: `${clamped}%` }}
        />
        {over && (
          <div
            className="absolute inset-y-0 right-0 animate-pulse bg-red-700/40"
            style={{ width: `${Math.min(pct - 100, 30)}%` }}
          />
        )}
      </div>
      <div className={cn("mt-1 text-[11px]", labelColor)}>{stateMsg[state]}</div>
    </div>
  );
}