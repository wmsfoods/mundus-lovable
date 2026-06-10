import { useMemo, useState } from "react";
import { useReport, type MarketFilters } from "./useReport";
import { WidgetShell } from "./WidgetShell";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtTon, fmtUsdCompact, fmtPrice, fmtCompactNumber, truncate } from "./format";
import { Search } from "lucide-react";

function FilterableTable({ rows, columns, search }: {
  rows: any[];
  columns: { key: string; label: string; align?: "left" | "right"; render?: (v: any, row: any) => any }[];
  search: string;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)));
  }, [rows, search, columns]);

  return (
    <div className="rounded-md border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            {columns.map((c) => (
              <TableHead key={c.key} className={`text-[11px] uppercase ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {filtered.map((r, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.align === "right" ? "text-right" : ""}>
                  {c.render ? c.render(r[c.key], r) : r[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function FlowsTab({ filters }: { filters: MarketFilters }) {
  const pairs = useReport<{ rows: any[] }>("pairs", filters);
  const flows = useReport<{ rows: any[] }>("flows", filters);
  const [qPairs, setQPairs] = useState("");
  const [qFlows, setQFlows] = useState("");

  return (
    <div className="space-y-4">
      <WidgetShell title="Relações comerciais (Exportador → Importador)"
        action={
          <div className="relative w-[260px]">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 pl-7 text-xs" placeholder="Buscar..." value={qPairs} onChange={(e) => setQPairs(e.target.value)} />
          </div>
        }
        loading={pairs.loading} error={pairs.error}
        empty={!pairs.loading && !pairs.data?.rows?.length} onRetry={pairs.refetch} height={420}>
        <FilterableTable rows={pairs.data?.rows ?? []} search={qPairs} columns={[
          { key: "shipper", label: "Exportador", render: (v) => <span title={v}>{truncate(String(v ?? ""), 36)}</span> },
          { key: "consignee", label: "Importador", render: (v) => <span title={v}>{truncate(String(v ?? ""), 36)}</span> },
          { key: "vol_ton", label: "Volume (t)", align: "right", render: (v) => fmtTon(v) },
          { key: "fob_usd", label: "FOB", align: "right", render: (v) => fmtUsdCompact(v) },
          { key: "avg_price", label: "Preço médio", align: "right", render: (v) => fmtPrice(v) },
          { key: "shipments", label: "Embarques", align: "right", render: (v) => fmtCompactNumber(v) },
        ]} />
      </WidgetShell>

      <WidgetShell title="Exportador → País de destino"
        action={
          <div className="relative w-[260px]">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 pl-7 text-xs" placeholder="Buscar..." value={qFlows} onChange={(e) => setQFlows(e.target.value)} />
          </div>
        }
        loading={flows.loading} error={flows.error}
        empty={!flows.loading && !flows.data?.rows?.length} onRetry={flows.refetch} height={420}>
        <FilterableTable rows={flows.data?.rows ?? []} search={qFlows} columns={[
          { key: "shipper", label: "Exportador", render: (v) => <span title={v}>{truncate(String(v ?? ""), 40)}</span> },
          { key: "dest_country", label: "Destino" },
          { key: "vol_ton", label: "Volume (t)", align: "right", render: (v) => fmtTon(v) },
          { key: "fob_usd", label: "FOB", align: "right", render: (v) => fmtUsdCompact(v) },
          { key: "avg_price", label: "Preço médio", align: "right", render: (v) => fmtPrice(v) },
          { key: "shipments", label: "Embarques", align: "right", render: (v) => fmtCompactNumber(v) },
        ]} />
      </WidgetShell>
    </div>
  );
}