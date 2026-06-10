import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FiltersBar } from "./marketData/v2/FiltersBar";
import { OverviewTab } from "./marketData/v2/tabs/OverviewTab";
import { BuyersTab } from "./marketData/v2/tabs/BuyersTab";
import { ShippersTab } from "./marketData/v2/tabs/ShippersTab";
import { DestinationsTab } from "./marketData/v2/tabs/DestinationsTab";
import { FlowsTab } from "./marketData/v2/tabs/FlowsTab";
import { OpportunitiesTab } from "./marketData/v2/tabs/OpportunitiesTab";
import type { PanelFilters } from "./marketData/v2/types";
import AdminMarketDataExplorer from "./AdminMarketDataExplorer";
import { DataSourceCard } from "./marketData/v2/DataSourceCard";

function defaultFilters(): PanelFilters {
  const d = new Date();
  const to = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  d.setMonth(d.getMonth() - 11);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { from, to, realOwnerOnly: true };
}

function fmtSyncDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminMarketData() {
  const [filters, setFilters] = useState<PanelFilters>(() => defaultFilters());
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const initialOfferId = searchParams.get("offer");
  const [caption, setCaption] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== searchParams.get("tab")) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", activeTab);
      if (activeTab !== "oportunidades") next.delete("offer");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    supabase
      .from("meat_export_mirror")
      .select("synced_at", { head: false })
      .order("synced_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setLastSync(data.synced_at);
        }
      });
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1500px] mx-auto">
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900 text-xs dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Dados licenciados para uso interno Mundus Trade LLC. Não compartilhar externamente.</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Mundus Trade Intelligence — Exportações Brasileiras</h1>
          <p className="text-sm text-muted-foreground">
            ~2M registros desde 2019. {lastSync ? `Última atualização: ${fmtSyncDate(lastSync)}.` : ""}{caption ? ` ${caption}.` : ""}
          </p>
        </div>
      </div>

      <FiltersBar value={filters} onApply={setFilters} activeTab={activeTab} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="buyers">Compradores</TabsTrigger>
          <TabsTrigger value="shippers">Exportadores</TabsTrigger>
          <TabsTrigger value="destinations">Destinos</TabsTrigger>
          <TabsTrigger value="flows">Fluxos</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
          <TabsTrigger value="explorer">Explorer avançado</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab filters={filters} onCaption={setCaption} /></TabsContent>
        <TabsContent value="buyers" className="mt-4"><BuyersTab filters={filters} /></TabsContent>
        <TabsContent value="shippers" className="mt-4"><ShippersTab filters={filters} /></TabsContent>
        <TabsContent value="destinations" className="mt-4"><DestinationsTab filters={filters} /></TabsContent>
        <TabsContent value="flows" className="mt-4"><FlowsTab filters={filters} /></TabsContent>
        <TabsContent value="oportunidades" className="mt-4">
          <OpportunitiesTab filters={filters} initialOfferId={initialOfferId} />
        </TabsContent>
        <TabsContent value="explorer" className="mt-4">
          <DataSourceCard />
          <div className="-mx-4 md:-mx-6"><AdminMarketDataExplorer /></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
