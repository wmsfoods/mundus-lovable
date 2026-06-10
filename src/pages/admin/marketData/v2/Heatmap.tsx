import { fmtTonCompact, fmtUsdCompact, truncate, fmtLoads, toLoads } from "./format";
import type { MatrixPayload } from "./types";

// Sequential scale fading toward brand (low) → saturated brand (high)
function cellBg(v: number, max: number) {
  if (!max || v <= 0) return "transparent";
  const t = Math.min(1, v / max);
  // alpha 0.06..0.92
  const a = 0.06 + t * 0.86;
  return `rgba(182, 71, 105, ${a.toFixed(3)})`;
}
function cellFg(v: number, max: number) {
  if (!max) return "inherit";
  return v / max > 0.55 ? "white" : "inherit";
}

export function Heatmap({
  data, metric, rowLabel = "Linha", colLabel = "Coluna",
}: {
  data: MatrixPayload;
  metric: "volume" | "fob" | "loads";
  rowLabel?: string;
  colLabel?: string;
}) {
  // 'loads' is derived from the volume matrix client-side (volume / 27).
  const transform = metric === "loads" ? toLoads : (n: number) => n;
  const fmt = metric === "fob" ? fmtUsdCompact : metric === "loads" ? fmtLoads : fmtTonCompact;
  let max = 0;
  for (const r of data.rows) for (const c of data.cols) {
    const v = transform(data.cells[r]?.[c] ?? 0);
    if (v > max) max = v;
  }
  if (!data.rows.length || !data.cols.length) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Sem dados para os filtros.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-3">
      <table className="w-full text-[11px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card text-left font-medium text-muted-foreground px-3 py-2 border-b">
              {rowLabel} \ {colLabel}
            </th>
            {data.cols.map((c) => (
              <th key={c} className="font-medium text-muted-foreground px-2 py-2 border-b text-left whitespace-nowrap">
                {truncate(c, 18)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r}>
              <td className="sticky left-0 z-10 bg-card font-medium px-3 py-1.5 border-b border-border/40 whitespace-nowrap" title={r}>
                {truncate(r, 28)}
              </td>
              {data.cols.map((c) => {
                const v = transform(data.cells[r]?.[c] ?? 0);
                return (
                  <td
                    key={c}
                    className="px-2 py-1.5 border-b border-border/40 tabular-nums"
                    style={{ background: cellBg(v, max), color: cellFg(v, max) }}
                    title={`${r} → ${c}: ${fmt(v)}`}
                  >
                    {v > 0 ? fmt(v) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}