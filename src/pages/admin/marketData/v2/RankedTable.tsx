import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { fmtTonCompact, fmtUsdCompact, fmtPrice, fmtPct, fmtCompactNumber, downloadCsv, truncate, fmtLoadsNumber, toLoads } from "./format";
import type { TopRow } from "./types";

export function RankedTable({
  rows, csvFilename, onRowClick, nameHeader = "Nome",
}: {
  rows: TopRow[];
  csvFilename: string;
  onRowClick?: (name: string) => void;
  nameHeader?: string;
}) {
  const exportRows = rows.map((r) => ({
    ...r,
    loads: Number(toLoads(r.volume).toFixed(1)),
  }));
  const handleExport = () =>
    downloadCsv(csvFilename, exportRows, [
      { key: "name", label: nameHeader },
      { key: "volume", label: "Volume (kg)" },
      { key: "loads", label: "Loads (27t)" },
      { key: "fob", label: "FOB (US$)" },
      { key: "avg_price_ton", label: "Preço medio (US$/t)" },
      { key: "counterparts", label: "Contrapartes" },
      { key: "shipments", label: "Embarques" },
      { key: "share_pct", label: "Share (%)" },
    ]);
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={handleExport} disabled={!rows.length}>
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>
      <div className="overflow-x-auto -mx-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="font-medium py-2 px-3">#</th>
              <th className="font-medium py-2 px-3">{nameHeader}</th>
              <th className="font-medium py-2 px-3 text-right">Volume</th>
              <th className="font-medium py-2 px-3 text-right" title="Container loads (1 FCL = 27 t)">Loads</th>
              <th className="font-medium py-2 px-3 text-right">FOB</th>
              <th className="font-medium py-2 px-3 text-right">US$/t</th>
              <th className="font-medium py-2 px-3 text-right">Contrap.</th>
              <th className="font-medium py-2 px-3 text-right">Embarques</th>
              <th className="font-medium py-2 px-3 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.name}
                className={`border-b border-border/40 hover:bg-muted/40 ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(r.name)}
              >
                <td className="py-1.5 px-3 text-muted-foreground tabular-nums">{i + 1}</td>
                <td className="py-1.5 px-3 font-medium" title={r.name}>{truncate(r.name, 60)}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">{fmtTonCompact(r.volume)}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">{fmtLoadsNumber(r.volume)}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">{fmtUsdCompact(r.fob)}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">{fmtPrice(r.avg_price_ton)}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">{fmtCompactNumber(r.counterparts)}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">{fmtCompactNumber(r.shipments)}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">{fmtPct(r.share_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}