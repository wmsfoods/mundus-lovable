import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function WidgetShell({
  title, subtitle, actions, loading, error, empty, onRetry, height = 320, children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  height?: number;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </div>
      <div className="p-3" style={{ minHeight: height }}>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="h-7 gap-1">
                <RefreshCw className="h-3 w-3" /> Tentar novamente
              </Button>
            )}
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-10 text-muted-foreground">
            <Inbox className="h-5 w-5" />
            <p className="text-xs">Sem dados para os filtros atuais.</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}