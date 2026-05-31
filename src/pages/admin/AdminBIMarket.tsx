import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { DollarSign, Package, Activity, TrendingUp } from "lucide-react";
import { DateRangePills, type BIDateRange } from "@/components/admin/bi/DateRangePills";
import { ProteinPills, type ProteinFilter } from "@/components/admin/bi/ProteinPills";
import { KpiCard } from "@/components/admin/bi/KpiCard";
import { useMarketIntelligence, pctDelta } from "@/hooks/useMarketIntelligence";

const PROTEIN_COLORS: Record<string, string> = {
  Beef: "#B64769",
  Pork: "#E89B6B",
  Poultry: "#F2C94C",
  Lamb: "#7BAA8E",
  Ovine: "#5C8A9E",
  Veal: "#C9A0DC",
  Other: "#9CA3AF",
};

function fmtMoney(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
function fmtKg(n: number): string {
  if (!isFinite(n) || n === 0) return "0 kg";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M kg`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}t`;
  return `${Math.round(n)} kg`;
}
function fmtPx(n: number): string {
  if (!isFinite(n) || n === 0) return "—";
  return `$${n.toFixed(2)}/kg`;
}

export default function AdminBIMarket() {
  const [range, setRange] = useState<BIDateRange>("30d");
  const [protein, setProtein] = useState<ProteinFilter>("All");
  const q = useMarketIntelligence(range);
  const data = q.data;

  // Pivot price trend by protein into a single series per bucket
  const trendData = useMemo(() => {
    if (!data) return [] as Array<Record<string, any>>;
    const filtered = protein === "All"
      ? data.priceTrend
      : data.priceTrend.filter((p) => p.protein === protein);
    const map = new Map<string, Record<string, any>>();
    for (const pt of filtered) {
      const row = map.get(pt.bucket) ?? { bucket: pt.bucket };
      row[pt.protein] = Number(pt.avgPrice.toFixed(2));
      map.set(pt.bucket, row);
    }
    return Array.from(map.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
  }, [data, protein]);

  const trendProteins = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    for (const p of data.priceTrend) {
      if (protein === "All" || p.protein === protein) set.add(p.protein);
    }
    return Array.from(set);
  }, [data, protein]);

  const topCutsFiltered = useMemo(() => {
    if (!data) return [];
    return protein === "All" ? data.topCuts : data.topCuts.filter((c) => c.protein === protein);
  }, [data, protein]);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Market Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Asking prices, volume mix and top cuts across the marketplace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProteinPills value={protein} onChange={setProtein} available={data?.availableProteins} />
          <DateRangePills value={range} onChange={setRange} />
        </div>
      </header>

      {q.isLoading && (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      )}
      {q.error && (
        <div className="py-12 text-center text-sm text-rose-600">
          {String((q.error as any)?.message ?? "Error")}
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="GMV (asking)"
              value={fmtMoney(data.totalValueUsd)}
              delta={pctDelta(data.totalValueUsd, data.prev.valueUsd)}
              icon={DollarSign}
              hint="Sum of price × amount on listed offers"
            />
            <KpiCard
              label="Volume listed"
              value={fmtKg(data.totalVolumeKg)}
              delta={pctDelta(data.totalVolumeKg, data.prev.volumeKg)}
              icon={Package}
            />
            <KpiCard
              label="Avg price"
              value={fmtPx(data.avgPriceUsd)}
              delta={pctDelta(data.avgPriceUsd, data.prev.avgPrice)}
              icon={TrendingUp}
              hint="Volume-weighted"
            />
            <KpiCard
              label="Offers"
              value={String(data.offersCount)}
              delta={pctDelta(data.offersCount, data.prev.offersCount)}
              icon={Activity}
            />
          </section>

          {/* Price oscillation */}
          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-semibold">Price oscillation</h2>
                <p className="text-[11px] text-muted-foreground">
                  Average ask per kg over time {range === "90d" || range === "12m" ? "(weekly buckets)" : "(daily)"}
                </p>
              </div>
            </div>
            {trendData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No price data for this selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8, fontSize: 12,
                    }}
                    formatter={(v: number) => fmtPx(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trendProteins.map((p) => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stroke={PROTEIN_COLORS[p] ?? "#888"}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Protein mix + Top cuts */}
          <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-2">Protein mix (volume)</h2>
              {data.proteinMix.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.proteinMix}
                        dataKey="volumeKg"
                        nameKey="protein"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {data.proteinMix.map((p) => (
                          <Cell key={p.protein} fill={PROTEIN_COLORS[p.protein] ?? "#888"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8, fontSize: 12,
                        }}
                        formatter={(v: number) => fmtKg(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="mt-2 space-y-1.5">
                    {data.proteinMix.map((p) => (
                      <li key={p.protein} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{ background: PROTEIN_COLORS[p.protein] ?? "#888" }}
                          />
                          <span className="font-medium">{p.protein}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtKg(p.volumeKg)} · {Math.round(p.share * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">Top cuts {protein !== "All" ? `· ${protein}` : ""}</h2>
              {topCutsFiltered.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                        <th className="text-left font-medium py-2 pr-2">#</th>
                        <th className="text-left font-medium py-2 pr-2">Cut</th>
                        <th className="text-left font-medium py-2 pr-2">Protein</th>
                        <th className="text-right font-medium py-2 pr-2">Volume</th>
                        <th className="text-right font-medium py-2 pr-2">Avg price</th>
                        <th className="text-right font-medium py-2">GMV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCutsFiltered.map((c, idx) => {
                        const top = topCutsFiltered[0]?.totalValueUsd || 1;
                        const w = (c.totalValueUsd / top) * 100;
                        return (
                          <tr key={c.standardProductId} className="border-b last:border-0 relative">
                            <td className="py-2 pr-2 text-xs text-muted-foreground">#{idx + 1}</td>
                            <td className="py-2 pr-2 font-medium relative">
                              <span
                                className="absolute inset-y-0 left-0 -z-0 bg-[#B64769]/8 rounded"
                                style={{ width: `${w}%` }}
                              />
                              <span className="relative">{c.name}</span>
                            </td>
                            <td className="py-2 pr-2 text-xs">
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]"
                                style={{
                                  background: `${PROTEIN_COLORS[c.protein] ?? "#888"}22`,
                                  color: PROTEIN_COLORS[c.protein] ?? "#888",
                                }}
                              >
                                {c.protein}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">{fmtKg(c.totalVolumeKg)}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{fmtPx(c.avgPrice)}</td>
                            <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(c.totalValueUsd)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}