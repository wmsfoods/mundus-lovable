import { useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { ClipboardList, Package, DollarSign, Users } from "lucide-react";
import { DateRangePills, type BIDateRange } from "@/components/admin/bi/DateRangePills";
import { KpiCard } from "@/components/admin/bi/KpiCard";
import { useBuyerDemand, pctDelta } from "@/hooks/useBuyerDemand";

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
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function AdminBIDemand() {
  const [range, setRange] = useState<BIDateRange>("30d");
  const q = useBuyerDemand(range);
  const data = q.data;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Buyer Demand</h1>
          <p className="text-sm text-muted-foreground">
            Requests, target pricing, destinations and fulfillment by buyers.
          </p>
        </div>
        <DateRangePills value={range} onChange={setRange} />
      </header>

      {q.isLoading && <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}
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
              label="Requests"
              value={String(data.totalRequests)}
              delta={pctDelta(data.totalRequests, data.prev.totalRequests)}
              icon={ClipboardList}
            />
            <KpiCard
              label="Volume requested"
              value={fmtKg(data.totalVolumeKg)}
              delta={pctDelta(data.totalVolumeKg, data.prev.totalVolumeKg)}
              icon={Package}
            />
            <KpiCard
              label="Target GMV"
              value={fmtMoney(data.totalTargetValueUsd)}
              delta={pctDelta(data.totalTargetValueUsd, data.prev.totalTargetValueUsd)}
              icon={DollarSign}
              hint={`Avg target ${fmtPx(data.avgTargetPrice)}`}
            />
            <KpiCard
              label="Active buyers"
              value={String(data.newBuyers)}
              icon={Users}
              hint={`Fulfill rate ${fmtPct(data.fulfillRate)}`}
            />
          </section>

          {/* Trend */}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-2">Requests vs fulfilled</h2>
            {data.trend.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.trend} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="requests" stroke="#B64769" strokeWidth={2} dot={false} name="Requests" />
                  <Line type="monotone" dataKey="fulfilled" stroke="#7BAA8E" strokeWidth={2} dot={false} name="Fulfilled" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Destinations + Top cuts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">Top destinations</h2>
              {data.destinations.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                      <th className="text-left font-medium py-2 pr-2">Country</th>
                      <th className="text-right font-medium py-2 pr-2">Reqs</th>
                      <th className="text-right font-medium py-2 pr-2">Volume</th>
                      <th className="text-right font-medium py-2 pr-2">Target GMV</th>
                      <th className="text-right font-medium py-2">Fulfill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.destinations.map((d) => {
                      const top = data.destinations[0]?.volumeKg || 1;
                      const w = (d.volumeKg / top) * 100;
                      return (
                        <tr key={d.country} className="border-b last:border-0 relative">
                          <td className="py-2 pr-2 font-medium relative">
                            <span className="absolute inset-y-0 left-0 -z-0 bg-[#5C8A9E]/10 rounded" style={{ width: `${w}%` }} />
                            <span className="relative">{d.country}</span>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">{d.requests}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmtKg(d.volumeKg)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmtMoney(d.targetValueUsd)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{fmtPct(d.fulfillRate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">Most requested cuts</h2>
              {data.topCuts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                      <th className="text-left font-medium py-2 pr-2">Product</th>
                      <th className="text-right font-medium py-2 pr-2">Reqs</th>
                      <th className="text-right font-medium py-2 pr-2">Volume</th>
                      <th className="text-right font-medium py-2">Avg target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCuts.map((c, idx) => {
                      const top = data.topCuts[0]?.volumeKg || 1;
                      const w = (c.volumeKg / top) * 100;
                      return (
                        <tr key={c.product + idx} className="border-b last:border-0 relative">
                          <td className="py-2 pr-2 font-medium relative">
                            <span className="absolute inset-y-0 left-0 -z-0 bg-[#E89B6B]/12 rounded" style={{ width: `${w}%` }} />
                            <span className="relative">{c.product}</span>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">{c.requests}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmtKg(c.volumeKg)}</td>
                          <td className="py-2 text-right tabular-nums">{fmtPx(c.avgTargetPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Top buyers */}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Top buyers by volume requested</h2>
            {data.topBuyers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                      <th className="text-left font-medium py-2 pr-2">#</th>
                      <th className="text-left font-medium py-2 pr-2">Buyer</th>
                      <th className="text-right font-medium py-2 pr-2">Reqs</th>
                      <th className="text-right font-medium py-2 pr-2">Fulfilled</th>
                      <th className="text-right font-medium py-2 pr-2">Volume</th>
                      <th className="text-right font-medium py-2">Target GMV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topBuyers.map((b, idx) => {
                      const top = data.topBuyers[0]?.volumeKg || 1;
                      const w = (b.volumeKg / top) * 100;
                      return (
                        <tr key={b.buyerId} className="border-b last:border-0 relative">
                          <td className="py-2 pr-2 text-xs text-muted-foreground">#{idx + 1}</td>
                          <td className="py-2 pr-2 font-medium relative">
                            <span className="absolute inset-y-0 left-0 -z-0 bg-[#B64769]/10 rounded" style={{ width: `${w}%` }} />
                            <span className="relative">{b.buyerName}</span>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">{b.requests}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{b.fulfilled}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmtKg(b.volumeKg)}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(b.targetValueUsd)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Status mix */}
          {data.statusMix.length > 0 && (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">Request status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {data.statusMix.map((s) => (
                  <div key={s.status} className="rounded border bg-background p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.status}</div>
                    <div className="text-xl font-semibold tabular-nums">{s.count}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}