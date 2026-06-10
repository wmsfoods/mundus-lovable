import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { ReactNode } from "react";

export function WidgetShell({
  title,
  action,
  loading,
  error,
  empty,
  onRetry,
  children,
  bodyClassName,
  height = 280,
}: {
  title?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
  bodyClassName?: string;
  height?: number;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      {(title || action) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          {title && <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>}
          {action}
        </CardHeader>
      )}
      <CardContent className={bodyClassName ?? "pt-0"}>
        {loading ? (
          <div className="space-y-2" style={{ minHeight: height }}>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-full w-full" style={{ height: height - 32 }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-8" style={{ minHeight: height }}>
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar novamente
              </Button>
            )}
          </div>
        ) : empty ? (
          <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ minHeight: height }}>
            Sem dados para os filtros atuais.
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}