import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtTon, fmtUsdCompact, fmtPrice, fmtPercent, fmtCompactNumber, truncate } from "./format";

export type EntityRow = {
  name: string;
  vol_ton: number;
  fob_usd: number;
  avg_price: number | null;
  shipments: number;
  counterparts: number;
};

export function RankedTable({
  rows,
  counterpartLabel,
  onRowClick,
}: {
  rows: EntityRow[];
  counterpartLabel: string;
  onRowClick?: (row: EntityRow) => void;
}) {
  const total = rows.reduce((s, r) => s + Number(r.vol_ton ?? 0), 0);
  return (
    <div className="rounded-md border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-10 text-[11px] uppercase">#</TableHead>
            <TableHead className="text-[11px] uppercase">Nome</TableHead>
            <TableHead className="text-right text-[11px] uppercase">Volume (t)</TableHead>
            <TableHead className="text-right text-[11px] uppercase">FOB</TableHead>
            <TableHead className="text-right text-[11px] uppercase">Preço médio</TableHead>
            <TableHead className="text-right text-[11px] uppercase">Embarques</TableHead>
            <TableHead className="text-right text-[11px] uppercase">{counterpartLabel}</TableHead>
            <TableHead className="text-right text-[11px] uppercase">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {rows.map((r, i) => {
            const share = total ? (Number(r.vol_ton) / total) * 100 : 0;
            return (
              <TableRow
                key={i}
                className={onRowClick ? "cursor-pointer hover:bg-muted/40" : ""}
                onClick={() => onRowClick?.(r)}
              >
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium max-w-[320px]" title={r.name}>{truncate(r.name, 60)}</TableCell>
                <TableCell className="text-right">{fmtTon(r.vol_ton)}</TableCell>
                <TableCell className="text-right">{fmtUsdCompact(r.fob_usd)}</TableCell>
                <TableCell className="text-right">{fmtPrice(r.avg_price)}</TableCell>
                <TableCell className="text-right">{fmtCompactNumber(r.shipments)}</TableCell>
                <TableCell className="text-right">{fmtCompactNumber(r.counterparts)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmtPercent(share)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}