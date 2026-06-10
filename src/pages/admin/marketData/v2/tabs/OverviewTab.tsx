import { useEffect } from "react";
import { usePanel } from "../usePanel";
import { KpiCard } from "../KpiCard";
import { WidgetShell } from "../WidgetShell";
import { MonthlyComboChart } from "../MonthlyComboChart";
import { HorizontalBars } from "../HorizontalBars";
import { fmtTonCompact, fmtUsdCompact, fmtPrice, fmtCompactNumber, pctDelta, periodCaption } from "../format";
import type { PanelFilters, KpiPayload, MonthlyRow, TopRow } from "../types";

export function OverviewTab({ filters, onCaption }: { filters: PanelFilters; onCaption: (c: string | null) => void }) {
  const kpis = usePanel<KpiPayload>({ panel: "kpis", filters });
  const monthly = usePanel<{ rows: MonthlyRow[] }>({ panel: "monthly", filters });
  const destinations = usePanel<{ rows: TopRow[] }>({ panel: "top", filters, dimension: "destCountry", metric: "volume", limit: 10 });
  const products = usePanel<{ rows: TopRow[] }>({ panel: "top", filters, dimension: "hs8", metric: "volume", limit: 10 });
  const shippers = usePanel<{ rows: TopRow[] }>({ panel: "top", filters, dimension: "shipper", metric: "volume", limit: 10 });
  const consignees = usePanel<{ rows: TopRow[] }>({ panel: "top", filters, dimension: "consignee", metric: "volume", limit: 10 });

  useEffect(() => {
    if (monthly.data?.rows) onCaption(periodCaption(monthly.data.rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthly.data]);

  const c = kpis.data?.current;
  const p = kpis.data?.previous;
  const d = (k: keyof NonNullable<typeof c>) => (c && p ? pctDelta(Number(c[k] ?? 0), Number(p[k] ?? 0)) : null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Volume" value={fmtTonCompact(c?.volume)} delta={d("volume")} loading={kpis.loading} />
        <KpiCard label="FOB" value={fmtUsdCompact(c?.fob)} delta={d("fob")} loading={kpis.loading} />
        <KpiCard label="Preço médio" value={fmtPrice(c?.avg_price_ton)} delta={d("avg_price_ton")} loading={kpis.loading} />
        <KpiCard label="Exportadores" value={fmtCompactNumber(c?.shippers)} delta={d("shippers")} loading={kpis.loading} />
        <KpiCard label="Compradores" value={fmtCompactNumber(c?.consignees)} delta={d("consignees")} loading={kpis.loading} />
        <KpiCard label="Destinos" value={fmtCompactNumber(c?.dest_countries)} delta={d("dest_countries")} loading={kpis.loading} />
      </div>

      <WidgetShell
        title="Evolução mensal — Volume (t) × Preço médio (US$/t)"
        loading={monthly.loading} error={monthly.error}
        empty={!monthly.loading && !monthly.data?.rows?.length}
        onRetry={monthly.refetch} height={340}
      >
        <MonthlyComboChart rows={monthly.data?.rows ?? []} height={320} />
      </WidgetShell>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <WidgetShell title="Top 10 Destinos" loading={destinations.loading} error={destinations.error}
          empty={!destinations.loading && !destinations.data?.rows?.length} onRetry={destinations.refetch} height={320}>
          <HorizontalBars rows={destinations.data?.rows ?? []} />
        </WidgetShell>
        <WidgetShell title="Top 10 Produtos (HS8)" loading={products.loading} error={products.error}
          empty={!products.loading && !products.data?.rows?.length} onRetry={products.refetch} height={320}>
          <HorizontalBars rows={products.data?.rows ?? []} />
        </WidgetShell>
        <WidgetShell title="Top 10 Exportadores" loading={shippers.loading} error={shippers.error}
          empty={!shippers.loading && !shippers.data?.rows?.length} onRetry={shippers.refetch} height={320}>
          <HorizontalBars rows={shippers.data?.rows ?? []} />
        </WidgetShell>
        <WidgetShell title="Top 10 Compradores" loading={consignees.loading} error={consignees.error}
          empty={!consignees.loading && !consignees.data?.rows?.length} onRetry={consignees.refetch} height={320}>
          <HorizontalBars rows={consignees.data?.rows ?? []} />
        </WidgetShell>
      </div>
    </div>
  );
}