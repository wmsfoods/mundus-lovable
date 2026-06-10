import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { FiltersBar } from "./marketData/v2/FiltersBar";
import { OverviewTab } from "./marketData/v2/tabs/OverviewTab";
import { BuyersTab } from "./marketData/v2/tabs/BuyersTab";
import { ShippersTab } from "./marketData/v2/tabs/ShippersTab";
import { DestinationsTab } from "./marketData/v2/tabs/DestinationsTab";
import { FlowsTab } from "./marketData/v2/tabs/FlowsTab";
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

export default function AdminMarketData() {
  const [filters, setFilters] = useState<PanelFilters>(() => defaultFilters());
  const [activeTab, setActiveTab] = useState("overview");
  const [caption, setCaption] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1500px] mx-auto">
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900 text-xs dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Dados licenciados Agro Statistics — uso interno WMS Foods. Não compartilhar externamente.</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Trade Intelligence — Exportações Brasileiras</h1>
          <p className="text-sm text-muted-foreground">
            Bills of Lading (Datamar) — ~2M registros desde 2019.{caption ? ` ${caption}.` : ""}
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
          <TabsTrigger value="explorer">Explorer avançado</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab filters={filters} onCaption={setCaption} /></TabsContent>
        <TabsContent value="buyers" className="mt-4"><BuyersTab filters={filters} /></TabsContent>
        <TabsContent value="shippers" className="mt-4"><ShippersTab filters={filters} /></TabsContent>
        <TabsContent value="destinations" className="mt-4"><DestinationsTab filters={filters} /></TabsContent>
        <TabsContent value="flows" className="mt-4"><FlowsTab filters={filters} /></TabsContent>
        <TabsContent value="explorer" className="mt-4">
          <DataSourceCard />
          <div className="-mx-4 md:-mx-6"><AdminMarketDataExplorer /></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}