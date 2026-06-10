import { useState } from "react";
import { useReport, type MarketFilters } from "./useReport";
import { WidgetShell } from "./WidgetShell";
import { RankedTable, type EntityRow } from "./RankedTable";
import { EntityDrawer } from "./EntityDrawer";

export function ImportersTab({ filters }: { filters: MarketFilters }) {
  const { data, loading, error, refetch } = useReport<{ rows: EntityRow[] }>("top_consignees", filters);
  const [entity, setEntity] = useState<string | null>(null);
  return (
    <>
      <WidgetShell title="Top 15 Importadores" action={
        <span className="text-[11px] text-muted-foreground italic">Inteligência de prospecção — uso interno</span>
      } loading={loading} error={error}
        empty={!loading && !data?.rows?.length} onRetry={refetch} height={420}>
        <RankedTable rows={data?.rows ?? []} counterpartLabel="Nº exportadores"
          onRowClick={(r) => setEntity(r.name)} />
        <p className="text-[11px] text-muted-foreground mt-3">
          Clique em uma linha para ver quem fornece para este importador.
        </p>
      </WidgetShell>
      <EntityDrawer kind="consignee" entity={entity} filters={filters} onClose={() => setEntity(null)} />
    </>
  );
}