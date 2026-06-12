import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Database, Cloud, RefreshCw, Play, Loader2, ChevronDown, AlertCircle, Activity, Clock } from "lucide-react";

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
  lease_until?: string | null;
  current_chunk_offset?: number | null;
  current_chunk_started_at?: string | null;
  last_failed_offset?: number | null;
  last_failed_error?: string | null;
  last_failed_at?: string | null;
};

type CronRun = {
  runid: number;
  status: string;
  return_message: string | null;
  start_time: string | null;
  end_time: string | null;
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR").format(n);

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch { return iso; }
};

const fmtSecondsAgo = (iso: string | null | undefined, nowMs: number) => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const s = Math.max(0, Math.round((nowMs - t) / 1000));
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  return `${Math.floor(m / 60)}h ${m % 60}min atrás`;
};

export function DataSourceCard() {
  const [state, setState] = useState<SyncState | null>(null);
  const [cronRuns, setCronRuns] = useState<CronRun[]>([]);
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

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
    setCronRuns(((data as any)?.cron_runs ?? []) as CronRun[]);
    setServerNow((data as any)?.server_now ?? null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const intervalMs = state?.status === "backfilling" ? 5_000 : 30_000;
    const t = setInterval(refresh, intervalMs);
    return () => clearInterval(t);
  }, [state?.status, refresh]);

  // Local 1s tick so "Xs atrás" stays live between polls.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

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

  const usingMirror = state?.use_mirror === true;
  const progress = state?.total_rows
    ? Math.min(100, Math.round((Number(state.rows_copied) / Number(state.total_rows)) * 100))
    : 0;

  const nowMs = Date.now() + (tick * 0); // re-render trigger
  const leaseActive = state?.lease_until ? new Date(state.lease_until).getTime() > nowMs : false;
  const hasChunk = state?.current_chunk_started_at != null;
  const hasFailure = state?.last_failed_at != null;

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
              {state?.status === "backfilling" && (
                <Badge variant={leaseActive ? "default" : "destructive"} className="gap-1">
                  <Activity className="h-3 w-3" />
                  {leaseActive ? "worker ativo" : "sem worker"}
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

      {state?.status === "backfilling" && (
        <div className="mt-3 space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {fmt(Number(state.rows_copied))} / {fmt(state.total_rows ? Number(state.total_rows) : null)} registros
              {" · "}offset {fmt(Number(state.last_offset))}
            </span>
            <span>{progress}%</span>
          </div>
          {state.lease_until && (
            <div className="text-[11px] text-muted-foreground">
              Lease até {fmtDateTime(state.lease_until)} ({leaseActive ? "ativo" : "expirado"})
            </div>
          )}
          {hasChunk && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Chunk em andamento no offset {fmt(Number(state.current_chunk_offset))} —
              iniciado {fmtSecondsAgo(state.current_chunk_started_at, nowMs)}
            </div>
          )}
        </div>
      )}

      {hasFailure && (
        <Collapsible className="mt-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-destructive hover:underline">
              <AlertCircle className="h-3 w-3" />
              Última falha em {fmtDateTime(state?.last_failed_at)}
              <ChevronDown className="h-3 w-3" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs space-y-1">
              <div><span className="font-medium">Offset:</span> {fmt(state?.last_failed_offset ?? null)}</div>
              <div className="break-all"><span className="font-medium">Erro:</span> {state?.last_failed_error ?? "—"}</div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="mt-3 border-t pt-2">
        <div className="text-[11px] font-semibold text-muted-foreground mb-1">
          Cron · agrostats_backfill_tick (últimas 3 execuções)
        </div>
        {cronRuns.length === 0 ? (
          <div className="text-[11px] text-muted-foreground">Sem execuções registradas.</div>
        ) : (
          <ul className="space-y-0.5">
            {cronRuns.map((r) => (
              <li key={r.runid} className="flex items-center gap-2 text-[11px]">
                <Badge
                  variant={r.status === "succeeded" ? "outline" : r.status === "failed" ? "destructive" : "secondary"}
                  className="h-4 px-1.5 text-[10px]"
                >
                  {r.status}
                </Badge>
                <span className="text-muted-foreground">
                  {fmtDateTime(r.start_time)} ({fmtSecondsAgo(r.start_time, nowMs)})
                </span>
                {r.return_message && r.status !== "succeeded" && (
                  <span className="text-destructive truncate" title={r.return_message}>· {r.return_message}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {serverNow && (
          <div className="text-[10px] text-muted-foreground mt-1">
            Servidor: {fmtDateTime(serverNow)}
          </div>
        )}
      </div>
    </Card>
  );
}