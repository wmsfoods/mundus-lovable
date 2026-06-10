import { useState } from "react";
import { usePanel } from "../usePanel";
import { WidgetShell } from "../WidgetShell";
import { Heatmap } from "../Heatmap";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PanelFilters, MatrixPayload } from "../types";

const DIM_OPTS: { value: string; label: string }[] = [
  { value: "shipper", label: "Exportador" },
  { value: "consignee", label: "Comprador" },
  { value: "destCountry", label: "País destino" },
  { value: "polPort", label: "Porto BR" },
  { value: "hs8", label: "HS8" },
  { value: "shipperState", label: "UF exportador" },
  { value: "consigneeCountry", label: "País comprador" },
];
const METRICS = [
  { value: "volume", label: "Volume" },
  { value: "fob", label: "FOB" },
  { value: "loads", label: "Loads" },
];

export function FlowsTab({ filters }: { filters: PanelFilters }) {
  const [rowDim, setRowDim] = useState("shipper");
  const [colDim, setColDim] = useState("destCountry");
  const [metric, setMetric] = useState<"volume" | "fob" | "loads">("volume");
  const [limitRows, setLimitRows] = useState(15);
  const [limitCols, setLimitCols] = useState(8);

  const matrix = usePanel<MatrixPayload>({
    // 'loads' is derived from volume client-side; backend still queries the volume matrix.
    panel: "matrix", filters, rowDim, colDim, metric: metric === "loads" ? "volume" : metric, limitRows, limitCols,
  });

  const rowLabel = DIM_OPTS.find((d) => d.value === rowDim)?.label ?? rowDim;
  const colLabel = DIM_OPTS.find((d) => d.value === colDim)?.label ?? colDim;

  return (
    <WidgetShell
      title={`Fluxos — ${rowLabel} × ${colLabel}`}
      subtitle={`Métrica: ${metric === "volume" ? "Volume (t)" : metric === "fob" ? "FOB (US$)" : "Loads (FCL 27 t)"} · Top ${limitRows} × ${limitCols}`}
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <DimSelect label="Linhas" value={rowDim} onChange={setRowDim} />
          <DimSelect label="Colunas" value={colDim} onChange={setColDim} />
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Métrica</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
              <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{METRICS.map((m) => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <LimitSelect label="N linhas" value={limitRows} onChange={setLimitRows} max={15} />
          <LimitSelect label="N cols" value={limitCols} onChange={setLimitCols} max={8} />
        </div>
      }
      loading={matrix.loading} error={matrix.error}
      empty={!matrix.loading && !matrix.data?.rows?.length}
      onRetry={matrix.refetch} height={520}
    >
      {matrix.data && (
        <Heatmap data={matrix.data} metric={metric} rowLabel={rowLabel} colLabel={colLabel} />
      )}
    </WidgetShell>
  );
}

function DimSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{DIM_OPTS.map((d) => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
function LimitSelect({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max: number }) {
  const opts = [5, 8, 10, 12, 15].filter((n) => n <= max);
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map((n) => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}