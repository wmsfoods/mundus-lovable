import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { FiltersBar } from "./marketData/FiltersBar";
import { OverviewTab } from "./marketData/OverviewTab";
import { ExportersTab } from "./marketData/ExportersTab";
import { ImportersTab } from "./marketData/ImportersTab";
import { FlowsTab } from "./marketData/FlowsTab";
import { ProductsTab } from "./marketData/ProductsTab";
import type { MarketFilters } from "./marketData/useReport";
import AdminMarketDataExplorer from "./AdminMarketDataExplorer";

const DISTINCT_COL = {
  products: "Commodity_HS/HS8 Portugues",
  destCountries: "Place_and_Ports/DEST_Country",
  shippers: "Company_Shipper/Shipper Name",
  consignees: "Company_Consignee/Consignee Name",
} as const;

function defaultRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - 12);
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) };
}

export default function AdminMarketData() {
  const [filters, setFilters] = useState<MarketFilters>(() => defaultRange());
  const [options, setOptions] = useState<{ products: string[]; destCountries: string[]; shippers: string[]; consignees: string[] }>({
    products: [], destCountries: [], shippers: [], consignees: [],
  });

  // Load filter options from the schema-cache distincts + bootstrap top entities for combos
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("agrostats-market-data", {
          body: { action: "introspect", forceRefresh: false },
        });
        const distincts: Record<string, string[]> = (data as any)?.distincts ?? {};
        const pickFromDistincts: Partial<typeof options> = {};
        (Object.keys(DISTINCT_COL) as (keyof typeof DISTINCT_COL)[]).forEach((k) => {
          const col = DISTINCT_COL[k];
          if (distincts[col]?.length) (pickFromDistincts as any)[k] = distincts[col];
        });

        // Fetch top 100 of any missing one via the report API
        const missing = (Object.keys(DISTINCT_COL) as (keyof typeof DISTINCT_COL)[]).filter((k) => !(pickFromDistincts as any)[k]);
        const reportMap: Record<string, string> = {
          products: "top_products",
          destCountries: "top_destinations",
          shippers: "top_shippers",
          consignees: "top_consignees",
        };
        const fetched = await Promise.all(missing.map(async (k) => {
          const { data } = await supabase.functions.invoke("agrostats-market-data", {
            body: { action: "report", report: reportMap[k], filters: { dateFrom: "2019-01-01", dateTo: new Date().toISOString().slice(0, 10) } },
          });
          const rows = ((data as any)?.data?.rows ?? []) as { name: string }[];
          return [k, rows.map((r) => r.name).filter(Boolean)] as const;
        }));
        const fetchedObj = Object.fromEntries(fetched);

        setOptions({
          products: pickFromDistincts.products ?? fetchedObj.products ?? [],
          destCountries: pickFromDistincts.destCountries ?? fetchedObj.destCountries ?? [],
          shippers: pickFromDistincts.shippers ?? fetchedObj.shippers ?? [],
          consignees: pickFromDistincts.consignees ?? fetchedObj.consignees ?? [],
        });
      } catch {
        // silent — combos just stay empty
      }
    })();
  }, []);

  const sortedOptions = useMemo(() => ({
    products: [...options.products].sort((a, b) => a.localeCompare(b, "pt-BR")),
    destCountries: [...options.destCountries].sort((a, b) => a.localeCompare(b, "pt-BR")),
    shippers: [...options.shippers].sort((a, b) => a.localeCompare(b, "pt-BR")),
    consignees: [...options.consignees].sort((a, b) => a.localeCompare(b, "pt-BR")),
  }), [options]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1500px] mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Market Data — Exportações Brasileiras</h1>
        <p className="text-sm text-muted-foreground">
          Inteligência de mercado interna baseada em Bills of Lading (Datamar) — desde 2019.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900 text-xs dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Dados licenciados Agro Statistics — uso interno WMS Foods. Não compartilhar externamente.</span>
      </div>

      <FiltersBar value={filters} onApply={setFilters} options={sortedOptions} />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="exporters">Exportadores</TabsTrigger>
          <TabsTrigger value="importers">Importadores</TabsTrigger>
          <TabsTrigger value="flows">Fluxos</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab filters={filters} /></TabsContent>
        <TabsContent value="exporters" className="mt-4"><ExportersTab filters={filters} /></TabsContent>
        <TabsContent value="importers" className="mt-4"><ImportersTab filters={filters} /></TabsContent>
        <TabsContent value="flows" className="mt-4"><FlowsTab filters={filters} /></TabsContent>
        <TabsContent value="products" className="mt-4"><ProductsTab filters={filters} /></TabsContent>
        <TabsContent value="explorer" className="mt-4">
          <div className="-mx-4 md:-mx-6"><AdminMarketDataExplorer /></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}