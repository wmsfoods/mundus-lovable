import { fmtTon, fmtPercent, truncate } from "./format";

export function HorizontalBars({ rows, max = 10 }: { rows: { name: string; vol_ton: number }[]; max?: number }) {
  const data = rows.slice(0, max);
  const total = rows.reduce((s, r) => s + Number(r.vol_ton ?? 0), 0);
  const maxVal = Math.max(1, ...data.map((d) => Number(d.vol_ton ?? 0)));
  return (
    <div className="space-y-2">
      {data.map((r, i) => {
        const w = (Number(r.vol_ton ?? 0) / maxVal) * 100;
        const share = total ? (Number(r.vol_ton ?? 0) / total) * 100 : 0;
        return (
          <div key={i} className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="truncate" title={r.name}>{truncate(r.name, 38)}</span>
              <span className="tabular-nums text-xs text-muted-foreground">
                {fmtTon(r.vol_ton)} t · {fmtPercent(share)}
              </span>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full rounded" style={{ width: `${w}%`, background: "#B64769" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}