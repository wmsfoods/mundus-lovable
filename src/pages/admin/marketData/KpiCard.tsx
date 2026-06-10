import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  loading,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  loading?: boolean;
  hint?: string;
}) {
  const hasDelta = delta != null && isFinite(delta);
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-2" />
        ) : (
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        )}
        <div className="flex items-center justify-between mt-1 min-h-[18px]">
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
          {hasDelta && !loading && (
            <span className={cn(
              "ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
              up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}>
              {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(delta!).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}