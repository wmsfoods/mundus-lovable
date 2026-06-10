import { useState } from "react";
import { usePanel } from "../usePanel";
import { WidgetShell } from "../WidgetShell";
import { RankedTable } from "../RankedTable";
import { EntityDrawer } from "../EntityDrawer";
import type { PanelFilters, TopRow } from "../types";

export function ShippersTab({ filters }: { filters: PanelFilters }) {
  const top = usePanel<{ rows: TopRow[] }>({ panel: "top", filters, dimension: "shipper", metric: "volume", limit: 50 });
  const [sel, setSel] = useState<string | null>(null);
  return (
    <>
      <WidgetShell title="Exportadores — Top 50 (clique para perfil completo)"
        loading={top.loading} error={top.error}
        empty={!top.loading && !top.data?.rows?.length} onRetry={top.refetch} height={420}>
        <RankedTable rows={top.data?.rows ?? []} csvFilename="exportadores.csv"
          nameHeader="Exportador" onRowClick={setSel} />
      </WidgetShell>
      <EntityDrawer open={!!sel} onOpenChange={(v) => !v && setSel(null)}
        kind="shipper" name={sel} filters={filters} />
    </>
  );
}