import { fmtTon, fmtPercent, truncate } from "./format";

export type RankedRow = { name: string; vol_ton: number; fob_usd?: number; shipments?: number };

export function RankedList({ rows }: { rows: RankedRow[] }) {
  const total = rows.reduce((s, r) => s + Number(r.vol_ton ?? 0), 0);
  return (
    <ol className="space-y-1.5">
      {rows.map((r, i) => {
        const share = total ? (Number(r.vol_ton ?? 0) / total) * 100 : 0;
        return (
          <li key={i} className="grid grid-cols-[24px_1fr_auto] items-center gap-2 text-sm">
            <span className="text-[11px] text-muted-foreground tabular-nums">{i + 1}.</span>
            <div className="min-w-0">
              <div className="truncate text-sm" title={r.name}>{truncate(r.name, 48)}</div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, share)}%`, background: "#B64769" }} />
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-sm font-medium">{fmtTon(r.vol_ton)} t</div>
              <div className="text-[11px] text-muted-foreground">{fmtPercent(share)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}