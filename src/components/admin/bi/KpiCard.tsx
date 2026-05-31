import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  delta?: number; // -1..1 (percentage change vs previous period)
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2 text-muted-foreground text-[11px] uppercase tracking-wide">
        <span className="flex items-center gap-1.5">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {label}
        </span>
        {typeof delta === "number" && Math.abs(delta) >= 0.005 ? (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
              delta > 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(Math.round(delta * 100))}%
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground mt-1">{hint}</div> : null}
    </div>
  );
}