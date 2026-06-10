import { useState } from "react";
import { usePanel } from "../usePanel";
import { WidgetShell } from "../WidgetShell";
import { RankedTable } from "../RankedTable";
import { EntityDrawer } from "../EntityDrawer";
import type { PanelFilters, TopRow } from "../types";

export function BuyersTab({ filters }: { filters: PanelFilters }) {
  const top = usePanel<{ rows: TopRow[] }>({ panel: "top", filters, dimension: "consignee", metric: "volume", limit: 50 });
  const [sel, setSel] = useState<string | null>(null);
  return (
    <>
      <WidgetShell title="Compradores — Top 50 (clique para perfil completo)"
        loading={top.loading} error={top.error}
        empty={!top.loading && !top.data?.rows?.length} onRetry={top.refetch} height={420}>
        <RankedTable rows={top.data?.rows ?? []} csvFilename="compradores.csv"
          nameHeader="Comprador" onRowClick={setSel} />
      </WidgetShell>
      <EntityDrawer open={!!sel} onOpenChange={(v) => !v && setSel(null)}
        kind="consignee" name={sel} filters={filters} />
    </>
  );
}