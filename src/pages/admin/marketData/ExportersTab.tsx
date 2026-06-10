import { useState } from "react";
import { useReport, type MarketFilters } from "./useReport";
import { WidgetShell } from "./WidgetShell";
import { RankedTable, type EntityRow } from "./RankedTable";
import { EntityDrawer } from "./EntityDrawer";

export function ExportersTab({ filters }: { filters: MarketFilters }) {
  const { data, loading, error, refetch } = useReport<{ rows: EntityRow[] }>("top_shippers", filters);
  const [entity, setEntity] = useState<string | null>(null);
  return (
    <>
      <WidgetShell title="Top 15 Exportadores" loading={loading} error={error}
        empty={!loading && !data?.rows?.length} onRetry={refetch} height={420}>
        <RankedTable rows={data?.rows ?? []} counterpartLabel="Nº importadores"
          onRowClick={(r) => setEntity(r.name)} />
        <p className="text-[11px] text-muted-foreground mt-3">
          Clique em uma linha para abrir o perfil completo do exportador.
        </p>
      </WidgetShell>
      <EntityDrawer kind="shipper" entity={entity} filters={filters} onClose={() => setEntity(null)} />
    </>
  );
}