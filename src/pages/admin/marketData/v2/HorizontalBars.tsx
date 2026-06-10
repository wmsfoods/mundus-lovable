import { fmtTonCompact, fmtPct, truncate, fmtLoads } from "./format";
import type { TopRow } from "./types";

const BRAND = "#B64769";

export function HorizontalBars({
  rows, onClick, maxItems = 10,
}: {
  rows: TopRow[];
  onClick?: (name: string) => void;
  maxItems?: number;
}) {
  const slice = rows.slice(0, maxItems);
  const max = Math.max(...slice.map((r) => Number(r.volume) || 0), 1);
  return (
    <ul className="space-y-1.5">
      {slice.map((r) => {
        const w = (Number(r.volume) / max) * 100;
        const clickable = !!onClick;
        return (
          <li
            key={r.name}
            className={`group ${clickable ? "cursor-pointer" : ""}`}
            onClick={() => clickable && onClick!(r.name)}
          >
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="truncate font-medium" title={r.name}>{truncate(r.name, 42)}</span>
              <span className="tabular-nums text-muted-foreground shrink-0">
                {fmtTonCompact(r.volume)} <span className="opacity-60">· {fmtLoads(r.volume)} · {fmtPct(r.share_pct)}</span>
              </span>
            </div>
            <div className="relative h-2 rounded bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all group-hover:opacity-90"
                style={{ width: `${Math.max(2, w)}%`, background: BRAND }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}