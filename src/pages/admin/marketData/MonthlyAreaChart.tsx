import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMonth, fmtTon, fmtUsdCompact, fmtPrice } from "./format";

type Row = { month: string; vol_ton: number; fob_usd: number; avg_price: number | null };

export function MonthlyAreaChart({ rows, height = 320, compact = false }: { rows: Row[]; height?: number; compact?: boolean }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B64769" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#B64769" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis yAxisId="ton" tickFormatter={(v) => fmtTon(v)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={56} />
          {!compact && (
            <YAxis yAxisId="usd" orientation="right" tickFormatter={(v) => fmtUsdCompact(v)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={70} />
          )}
          <Tooltip
            contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            labelFormatter={(l) => fmtMonth(String(l))}
            formatter={(value: any, name: any) => {
              if (name === "vol_ton") return [fmtTon(value) + " t", "Volume"];
              if (name === "fob_usd") return [fmtUsdCompact(value), "FOB"];
              if (name === "avg_price") return [fmtPrice(value), "Preço médio"];
              return [value, name];
            }}
          />
          <Area yAxisId="ton" type="monotone" dataKey="vol_ton" stroke="#B64769" strokeWidth={2}
            fill="url(#volGradient)" />
          {!compact && (
            <Line yAxisId="usd" type="monotone" dataKey="fob_usd" stroke="#64748b" strokeWidth={1.5} dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}