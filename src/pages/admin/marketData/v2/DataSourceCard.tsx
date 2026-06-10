import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Database, Cloud, RefreshCw, Play, Loader2, KeyRound, Copy } from "lucide-react";

type SyncState = {
  status: "idle" | "backfilling" | "complete" | "error";
  rows_copied: number;
  total_rows: number | null;
  last_offset: number;
  last_error: string | null;
  last_synced_month: string | null;
  last_sync_at: string | null;
  use_mirror: boolean;
  updated_at: string;
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR").format(n);

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch { return iso; }
};

export function DataSourceCard() {
  const [state, setState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [cronSecret, setCronSecret] = useState<string | null>(null);
  const [showingSecret, setShowingSecret] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("agrostats-sync", {
      body: { action: "status" },
    });
    setLoading(false);
    if (error) {
      toast.error("Falha ao consultar status", { description: error.message });
      return;
    }
    setState((data as any)?.state ?? null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (state?.status !== "backfilling") return;
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [state?.status, refresh]);

  const startBackfill = async () => {
    setBusy("backfill");
    const { data, error } = await supabase.functions.invoke("agrostats-sync", {
      body: { action: "start-backfill" },
    });
    setBusy(null);
    if (error) {
      toast.error("Falha ao iniciar backfill", { description: error.message });
      return;
    }
    toast.success("Backfill iniciado", {
      description: `Copiando ${fmt((data as any)?.total_rows)} registros em background.`,
    });
    refresh();
  };

  const runIncremental = async () => {
    setBusy("incremental");
    const { data, error } = await supabase.functions.invoke("agrostats-sync", {
      body: { action: "incremental" },
    });
    setBusy(null);
    if (error) {
      toast.error("Falha na sincronização", { description: error.message });
      return;
    }
    toast.success("Sincronização concluída", {
      description: `${fmt((data as any)?.rows_inserted)} registros atualizados.`,
    });
    refresh();
  };

  const revealCronSecret = async () => {
    setBusy("secret");
    const { data, error } = await supabase.rpc("admin_get_agrostats_cron_secret" as any);
    setBusy(null);
    if (error) {
      toast.error("Falha ao obter secret", { description: error.message });
      return;
    }
    setCronSecret(String(data ?? ""));
    setShowingSecret(true);
  };

  const copySecret = async () => {
    if (!cronSecret) return;
    try {
      await navigator.clipboard.writeText(cronSecret);
      toast.success("Copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const usingMirror = state?.use_mirror === true;
  const progress = state?.total_rows
    ? Math.min(100, Math.round((Number(state.rows_copied) / Number(state.total_rows)) * 100))
    : 0;

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`rounded-md p-2 ${usingMirror ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30"}`}>
            {usingMirror ? <Database className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">Fonte de dados</h3>
              <Badge variant={usingMirror ? "default" : "secondary"}>
                {usingMirror ? "Espelho local (Mundus)" : "Conexão externa (Agro Statistics)"}
              </Badge>
              {state?.status && state.status !== "idle" && (
                <Badge variant={state.status === "error" ? "destructive" : "outline"}>
                  {state.status}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sincronização automática: semanal (segunda 06:00 UTC)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {usingMirror
                ? "Consultas rodam no banco Mundus. Independente do parceiro externo."
                : "Consultas vão direto ao Agro Statistics (Neon). Faça o backfill para mudar para o espelho local."}
              {state?.last_synced_month && (
                <> {" · "} Último mês sincronizado: <span className="font-medium">{state.last_synced_month}</span></>
              )}
              {state?.last_sync_at && (
                <> {" · "} Última sincronização: <span className="font-medium">{fmtDateTime(state.last_sync_at)}</span></>
              )}
            </p>
            {state?.last_error && (
              <p className="text-xs text-destructive mt-1 truncate" title={state.last_error}>
                Erro: {state.last_error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" variant="ghost" onClick={revealCronSecret} disabled={busy !== null} title="Mostrar o CRON secret para configurar em Lovable Secrets">
            {busy === "secret" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />}
            CRON secret
          </Button>
          <Button size="sm" variant="outline" onClick={runIncremental} disabled={busy !== null || state?.status === "backfilling"}>
            {busy === "incremental" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Sincronizar agora
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={busy !== null || state?.status === "backfilling"}>
                <Play className="h-4 w-4 mr-1" />
                {state?.status === "error" ? "Retomar backfill" : "Iniciar backfill"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Iniciar backfill completo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Vai copiar aproximadamente 2 milhões de registros do banco externo para o espelho local.
                  Roda em background e pode levar várias horas. Durante o processo as consultas continuam usando a conexão externa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={startBackfill}>Iniciar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {showingSecret && cronSecret && (
        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-xs space-y-2">
          <p className="text-muted-foreground">
            Cole este valor em <span className="font-medium">Lovable → Secrets → CRON_SECRET</span> para o cron semanal autenticar no edge function.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate font-mono bg-background border rounded px-2 py-1">{cronSecret}</code>
            <Button size="sm" variant="outline" onClick={copySecret}><Copy className="h-3 w-3 mr-1" />Copiar</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowingSecret(false)}>Ocultar</Button>
          </div>
        </div>
      )}

      {state?.status === "backfilling" && (
        <div className="mt-3 space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmt(Number(state.rows_copied))} / {fmt(state.total_rows ? Number(state.total_rows) : null)} registros</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}
    </Card>
  );
}