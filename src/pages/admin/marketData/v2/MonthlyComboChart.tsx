import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line, Legend } from "recharts";
import { fmtMonth, fmtTonCompact, fmtPrice } from "./format";
import type { MonthlyRow } from "./types";

const BRAND = "#B64769";
const SLATE = "#475569";

export function MonthlyComboChart({ rows, height = 320 }: { rows: MonthlyRow[]; height?: number }) {
  const data = rows.map((r) => ({
    month: r.month,
    monthLabel: fmtMonth(r.month),
    volume: Number(r.volume) || 0,
    avg_price_ton: r.avg_price_ton == null ? null : Number(r.avg_price_ton),
  }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtTonCompact(v).replace(" ton", "")}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => "US$ " + Math.round(v).toLocaleString("pt-BR")}
            width={80}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(v: any, name: string) =>
              name === "Volume" ? [fmtTonCompact(Number(v)), name] : [fmtPrice(Number(v)), name]
            }
            labelFormatter={(l) => String(l)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="volume" name="Volume" fill={BRAND} radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avg_price_ton"
            name="Preço médio (US$/t)"
            stroke={SLATE}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}