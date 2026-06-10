import { Skeleton } from "@/components/ui/skeleton";
import { fmtPct } from "./format";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export function KpiCard({
  label, value, hint, delta, loading,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  loading?: boolean;
}) {
  const positive = delta != null && delta > 0.5;
  const negative = delta != null && delta < -0.5;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const tone = positive ? "text-emerald-600" : negative ? "text-red-600" : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1.5 min-h-[96px]">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <span className="text-xl md:text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      )}
      <div className="flex items-center gap-2 text-xs">
        {delta != null && !loading && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
            <Icon className="h-3 w-3" />
            {fmtPct(delta)}
          </span>
        )}
        {hint && <span className="text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}