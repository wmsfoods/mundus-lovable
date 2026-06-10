import { useReport, type MarketFilters } from "./useReport";
import { KpiCard } from "./KpiCard";
import { WidgetShell } from "./WidgetShell";
import { MonthlyAreaChart } from "./MonthlyAreaChart";
import { HorizontalBars } from "./HorizontalBars";
import { RankedList } from "./RankedList";
import { fmtTon, fmtUsdCompact, fmtPrice, fmtCompactNumber, pctDelta } from "./format";

export function OverviewTab({ filters }: { filters: MarketFilters }) {
  const kpis = useReport<{ current: any; previous: any | null }>("kpis", filters);
  const monthly = useReport<{ rows: any[] }>("monthly_series", filters);
  const destinations = useReport<{ rows: any[] }>("top_destinations", filters);
  const products = useReport<{ rows: any[] }>("top_products", filters);
  const shippers = useReport<{ rows: any[] }>("top_shippers", filters);
  const consignees = useReport<{ rows: any[] }>("top_consignees", filters);

  const c = kpis.data?.current ?? {};
  const p = kpis.data?.previous ?? {};
  const d = (k: string) => p && p[k] != null ? pctDelta(Number(c[k] ?? 0), Number(p[k])) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Volume" value={fmtTon(c.vol_ton) + " t"} delta={d("vol_ton")} loading={kpis.loading} />
        <KpiCard label="Valor FOB" value={fmtUsdCompact(c.fob_usd)} delta={d("fob_usd")} loading={kpis.loading} />
        <KpiCard label="Preço médio" value={fmtPrice(c.vol_ton ? c.fob_usd / c.vol_ton : null)}
          delta={p?.vol_ton ? pctDelta(c.fob_usd / Math.max(c.vol_ton, 1), p.fob_usd / Math.max(p.vol_ton, 1)) : null}
          loading={kpis.loading} />
        <KpiCard label="Embarques" value={fmtCompactNumber(c.shipments)} delta={d("shipments")} loading={kpis.loading} />
        <KpiCard label="Exportadores ativos" value={fmtCompactNumber(c.shippers)} delta={d("shippers")} loading={kpis.loading} />
        <KpiCard label="Importadores ativos" value={fmtCompactNumber(c.consignees)} delta={d("consignees")} loading={kpis.loading} />
      </div>

      <WidgetShell
        title="Evolução mensal — Volume (t) e FOB (US$)"
        loading={monthly.loading} error={monthly.error}
        empty={!monthly.loading && !monthly.data?.rows?.length}
        onRetry={monthly.refetch} height={340}
      >
        <MonthlyAreaChart rows={monthly.data?.rows ?? []} height={320} />
      </WidgetShell>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <WidgetShell title="Top 10 Destinos" loading={destinations.loading} error={destinations.error}
          empty={!destinations.loading && !destinations.data?.rows?.length} onRetry={destinations.refetch} height={320}>
          <HorizontalBars rows={destinations.data?.rows ?? []} />
        </WidgetShell>
        <WidgetShell title="Top 10 Produtos" loading={products.loading} error={products.error}
          empty={!products.loading && !products.data?.rows?.length} onRetry={products.refetch} height={320}>
          <HorizontalBars rows={products.data?.rows ?? []} />
        </WidgetShell>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <WidgetShell title="Top 10 Exportadores" loading={shippers.loading} error={shippers.error}
          empty={!shippers.loading && !shippers.data?.rows?.length} onRetry={shippers.refetch} height={360}>
          <RankedList rows={(shippers.data?.rows ?? []).slice(0, 10)} />
        </WidgetShell>
        <WidgetShell title="Top 10 Importadores" loading={consignees.loading} error={consignees.error}
          empty={!consignees.loading && !consignees.data?.rows?.length} onRetry={consignees.refetch} height={360}>
          <RankedList rows={(consignees.data?.rows ?? []).slice(0, 10)} />
        </WidgetShell>
      </div>
    </div>
  );
}