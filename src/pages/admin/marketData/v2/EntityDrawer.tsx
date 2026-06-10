import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { usePanel } from "./usePanel";
import type { PanelFilters, MonthlyRow, TopRow, KpiPayload } from "./types";
import { KpiCard } from "./KpiCard";
import { WidgetShell } from "./WidgetShell";
import { MonthlyComboChart } from "./MonthlyComboChart";
import { HorizontalBars } from "./HorizontalBars";
import { fmtTonCompact, fmtUsdCompact, fmtPrice, fmtCompactNumber, pctDelta, fmtLoads } from "./format";
import { ApolloLookup } from "./ApolloLookup";

type EntityKind = "shipper" | "consignee" | "destCountry";

export function EntityDrawer({
  open, onOpenChange, kind, name, filters,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: EntityKind;
  name: string | null;
  filters: PanelFilters;
}) {
  const scoped: PanelFilters = name
    ? kind === "shipper"
      ? { ...filters, shipperName: name }
      : kind === "consignee"
      ? { ...filters, consigneeName: name }
      : { ...filters, destCountry: [name] }
    : filters;

  const kpis = usePanel<KpiPayload>(name ? { panel: "kpis", filters: scoped } : null);
  const monthly = usePanel<{ rows: MonthlyRow[] }>(name ? { panel: "monthly", filters: scoped } : null);

  const cpDim =
    kind === "shipper" ? "consignee" :
    kind === "consignee" ? "shipper" :
    "shipper";
  const counterparts = usePanel<{ rows: TopRow[] }>(
    name ? { panel: "top", filters: scoped, dimension: cpDim, metric: "volume", limit: 10 } : null,
  );
  const destinations = usePanel<{ rows: TopRow[] }>(
    name && kind !== "destCountry"
      ? { panel: "top", filters: scoped, dimension: "destCountry", metric: "volume", limit: 10 }
      : null,
  );
  const products = usePanel<{ rows: TopRow[] }>(
    name ? { panel: "top", filters: scoped, dimension: "hs8", metric: "volume", limit: 10 } : null,
  );

  const c = kpis.data?.current;
  const p = kpis.data?.previous;
  const d = (k: keyof typeof c) => (c && p ? pctDelta(Number(c[k] ?? 0), Number(p[k] ?? 0)) : null);

  const labelKind = kind === "shipper" ? "Exportador" : kind === "consignee" ? "Importador" : "Destino";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetDescription className="text-[11px] uppercase tracking-wide">{labelKind}</SheetDescription>
          <SheetTitle className="text-lg">{name ?? "—"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <KpiCard label="Volume" value={fmtTonCompact(c?.volume)} delta={d("volume")} loading={kpis.loading} />
          <KpiCard label="Loads" value={fmtLoads(c?.volume)} hint="1 FCL = 27 t" delta={d("volume")} loading={kpis.loading} />
          <KpiCard label="FOB" value={fmtUsdCompact(c?.fob)} delta={d("fob")} loading={kpis.loading} />
          <KpiCard label="Preço médio" value={fmtPrice(c?.avg_price_ton)} delta={d("avg_price_ton")} loading={kpis.loading} />
          <KpiCard
            label={cpDim === "consignee" ? "Compradores" : "Exportadores"}
            value={fmtCompactNumber(cpDim === "consignee" ? c?.consignees : c?.shippers)}
            loading={kpis.loading}
          />
        </div>

        <div className="mt-4">
          <WidgetShell
            title="Evolução mensal"
            loading={monthly.loading}
            error={monthly.error}
            empty={!monthly.loading && !monthly.data?.rows?.length}
            onRetry={monthly.refetch}
            height={220}
          >
            <MonthlyComboChart rows={monthly.data?.rows ?? []} height={220} />
          </WidgetShell>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <WidgetShell
            title={cpDim === "consignee" ? "Top compradores" : "Top exportadores"}
            loading={counterparts.loading}
            error={counterparts.error}
            empty={!counterparts.loading && !counterparts.data?.rows?.length}
            onRetry={counterparts.refetch}
            height={260}
          >
            <HorizontalBars rows={counterparts.data?.rows ?? []} />
          </WidgetShell>

          {kind !== "destCountry" && (
            <WidgetShell
              title="Top destinos"
              loading={destinations.loading}
              error={destinations.error}
              empty={!destinations.loading && !destinations.data?.rows?.length}
              onRetry={destinations.refetch}
              height={260}
            >
              <HorizontalBars rows={destinations.data?.rows ?? []} />
            </WidgetShell>
          )}

          <WidgetShell
            title="Top produtos (HS8)"
            loading={products.loading}
            error={products.error}
            empty={!products.loading && !products.data?.rows?.length}
            onRetry={products.refetch}
            height={260}
          >
            <HorizontalBars rows={products.data?.rows ?? []} />
          </WidgetShell>
        </div>

        {name && kind !== "destCountry" && (
          <ApolloLookup name={name} kind={kind} />
        )}
      </SheetContent>
    </Sheet>
  );
}