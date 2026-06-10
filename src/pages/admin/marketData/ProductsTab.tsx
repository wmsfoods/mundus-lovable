import { useState } from "react";
import { useReport, type MarketFilters } from "./useReport";
import { WidgetShell } from "./WidgetShell";
import { RankedTable, type EntityRow } from "./RankedTable";
import { MonthlyAreaChart } from "./MonthlyAreaChart";
import { RankedList } from "./RankedList";

export function ProductsTab({ filters }: { filters: MarketFilters }) {
  const { data, loading, error, refetch } = useReport<{ rows: EntityRow[] }>("top_products", filters);
  const [product, setProduct] = useState<string | null>(null);

  const sub = product ? { ...filters, products: [product] } : null;
  const monthly = useReport<{ rows: any[] }>("monthly_series", sub ?? filters, { enabled: !!sub });
  const shippers = useReport<{ rows: any[] }>("top_shippers", sub ?? filters, { enabled: !!sub });
  const consignees = useReport<{ rows: any[] }>("top_consignees", sub ?? filters, { enabled: !!sub });

  return (
    <div className="space-y-4">
      <WidgetShell title="Top 15 Produtos (HS8)" loading={loading} error={error}
        empty={!loading && !data?.rows?.length} onRetry={refetch} height={420}>
        <RankedTable rows={data?.rows ?? []} counterpartLabel="Nº exportadores"
          onRowClick={(r) => setProduct(r.name)} />
        <p className="text-[11px] text-muted-foreground mt-3">
          Clique em um produto para ver evolução, quem exporta e quem compra.
        </p>
      </WidgetShell>

      {product && (
        <>
          <WidgetShell title={`Evolução — ${product}`} loading={monthly.loading} error={monthly.error}
            empty={!monthly.loading && !monthly.data?.rows?.length} onRetry={monthly.refetch} height={260}>
            <MonthlyAreaChart rows={monthly.data?.rows ?? []} height={240} />
          </WidgetShell>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <WidgetShell title="Quem exporta este produto" loading={shippers.loading} error={shippers.error}
              empty={!shippers.loading && !shippers.data?.rows?.length} onRetry={shippers.refetch} height={360}>
              <RankedList rows={(shippers.data?.rows ?? []).slice(0, 10)} />
            </WidgetShell>
            <WidgetShell title="Quem compra este produto" loading={consignees.loading} error={consignees.error}
              empty={!consignees.loading && !consignees.data?.rows?.length} onRetry={consignees.refetch} height={360}>
              <RankedList rows={(consignees.data?.rows ?? []).slice(0, 10)} />
            </WidgetShell>
          </div>
        </>
      )}
    </div>
  );
}