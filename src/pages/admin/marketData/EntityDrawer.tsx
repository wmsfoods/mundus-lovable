import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useReport, type MarketFilters } from "./useReport";
import { WidgetShell } from "./WidgetShell";
import { MonthlyAreaChart } from "./MonthlyAreaChart";
import { RankedList } from "./RankedList";
import { KpiCard } from "./KpiCard";
import { fmtTon, fmtUsdCompact, fmtPrice } from "./format";
import { useMemo } from "react";

export function EntityDrawer({
  kind, entity, filters, onClose,
}: {
  kind: "shipper" | "consignee" | null;
  entity: string | null;
  filters: MarketFilters;
  onClose: () => void;
}) {
  const open = !!(kind && entity);
  const report = kind === "shipper" ? "shipper_profile" : kind === "consignee" ? "consignee_profile" : "kpis";

  const profile = useReport<any>(report, filters, { entity: entity ?? undefined, enabled: open });

  const totals = useMemo(() => {
    const rows = profile.data?.monthly ?? [];
    const vol = rows.reduce((s: number, r: any) => s + Number(r.vol_ton ?? 0), 0);
    const fob = rows.reduce((s: number, r: any) => s + Number(r.fob_usd ?? 0), 0);
    return { vol, fob, price: vol ? fob / vol : null };
  }, [profile.data]);

  const title = kind === "shipper" ? "Perfil do Exportador" : "Perfil do Importador";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[680px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-2 mb-4">
          <p className="text-lg font-semibold leading-tight">{entity}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <KpiCard label="Volume" value={fmtTon(totals.vol) + " t"} loading={profile.loading} />
          <KpiCard label="FOB" value={fmtUsdCompact(totals.fob)} loading={profile.loading} />
          <KpiCard label="Preço médio" value={fmtPrice(totals.price)} loading={profile.loading} />
        </div>

        <WidgetShell title="Evolução mensal" loading={profile.loading} error={profile.error}
          empty={!profile.loading && !profile.data?.monthly?.length} onRetry={profile.refetch} height={220}>
          <MonthlyAreaChart rows={profile.data?.monthly ?? []} height={200} compact />
        </WidgetShell>

        <div className="grid grid-cols-1 gap-3 mt-3">
          {kind === "shipper" ? (
            <>
              <WidgetShell title="Top 5 Importadores (quem compra)" loading={profile.loading} error={profile.error}
                empty={!profile.loading && !profile.data?.consignees?.length} onRetry={profile.refetch} height={180}>
                <RankedList rows={profile.data?.consignees ?? []} />
              </WidgetShell>
              <WidgetShell title="Top 5 Destinos" loading={profile.loading} error={profile.error}
                empty={!profile.loading && !profile.data?.destinations?.length} onRetry={profile.refetch} height={180}>
                <RankedList rows={profile.data?.destinations ?? []} />
              </WidgetShell>
              <WidgetShell title="Top 5 Produtos" loading={profile.loading} error={profile.error}
                empty={!profile.loading && !profile.data?.products?.length} onRetry={profile.refetch} height={180}>
                <RankedList rows={profile.data?.products ?? []} />
              </WidgetShell>
            </>
          ) : (
            <>
              <WidgetShell title="Top 5 Exportadores (quem fornece)" loading={profile.loading} error={profile.error}
                empty={!profile.loading && !profile.data?.shippers?.length} onRetry={profile.refetch} height={180}>
                <RankedList rows={profile.data?.shippers ?? []} />
              </WidgetShell>
              <WidgetShell title="Top 5 Portos de destino" loading={profile.loading} error={profile.error}
                empty={!profile.loading && !profile.data?.destPorts?.length} onRetry={profile.refetch} height={180}>
                <RankedList rows={profile.data?.destPorts ?? []} />
              </WidgetShell>
              <WidgetShell title="Top 5 Produtos" loading={profile.loading} error={profile.error}
                empty={!profile.loading && !profile.data?.products?.length} onRetry={profile.refetch} height={180}>
                <RankedList rows={profile.data?.products ?? []} />
              </WidgetShell>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}