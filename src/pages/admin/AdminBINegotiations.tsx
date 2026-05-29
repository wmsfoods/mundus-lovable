import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";
import { Handshake, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { DateRangePills, type BIDateRange } from "@/components/admin/bi/DateRangePills";
import { KpiCard } from "@/components/admin/bi/KpiCard";
import { useNegotiationFunnel, pctDelta } from "@/hooks/useNegotiationFunnel";

const STATUS_COLORS: Record<string, string> = {
  awaiting_supplier: "#F2C94C",
  pending_buyer_review: "#5C8A9E",
  bid_accepted: "#7BAA8E",
  offer_rejected: "#B64769",
  offer_exhausted: "#9CA3AF",
  expired: "#6B7280",
};
const STATUS_LABEL: Record<string, string> = {
  awaiting_supplier: "Awaiting supplier",
  pending_buyer_review: "Pending buyer",
  bid_accepted: "Accepted",
  offer_rejected: "Rejected",
  offer_exhausted: "Exhausted",
  expired: "Expired",
};

function fmtMoney(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
function fmtHours(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default function AdminBINegotiations() {
  const [range, setRange] = useState<BIDateRange>("30d");
  const q = useNegotiationFunnel(range);
  const data = q.data;

  const offerToNeg = data && data.offersPublished > 0
    ? data.negotiationsStarted / data.offersPublished : 0;
  const negToAccept = data && data.negotiationsStarted > 0
    ? data.negotiationsAccepted / data.negotiationsStarted : 0;
  const acceptToOrder = data && data.negotiationsAccepted > 0
    ? data.ordersCreated / data.negotiationsAccepted : 0;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Negotiation Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Conversion from offers → negotiations → accepted → orders.
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
              label="Negotiations"
              value={String(data.negotiationsStarted)}
              delta={pctDelta(data.negotiationsStarted, data.prev.negotiationsStarted)}
              icon={Handshake}
              hint="Started in period"
            />
            <KpiCard
              label="Accepted"
              value={String(data.negotiationsAccepted)}
              delta={pctDelta(data.negotiationsAccepted, data.prev.negotiationsAccepted)}
              icon={CheckCircle2}
              hint={`${fmtPct(negToAccept)} of started`}
            />
            <KpiCard
              label="Settled GMV"
              value={fmtMoney(data.totalSettledUsd)}
              delta={pctDelta(data.totalSettledUsd, data.prev.totalSettledUsd)}
              icon={DollarSign}
            />
            <KpiCard
              label="Avg time to close"
              value={fmtHours(data.avgHoursToClose)}
              icon={Clock}
              hint={`Avg rounds: ${data.avgRounds.toFixed(1)}`}
            />
          </section>

          {/* Funnel */}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Conversion funnel</h2>
            {data.funnel[0].count === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
            ) : (
              <div className="space-y-2">
                {data.funnel.map((s, idx) => {
                  const top = data.funnel[0].count || 1;
                  const w = Math.max(4, (s.count / top) * 100);
                  const prev = idx > 0 ? data.funnel[idx - 1].count : null;
                  const conv = prev && prev > 0 ? s.count / prev : null;
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <div className="w-44 text-sm font-medium shrink-0">{s.label}</div>
                      <div className="flex-1 relative h-8 bg-muted/40 rounded overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{
                            width: `${w}%`,
                            background: `linear-gradient(90deg, #B64769 0%, #E89B6B 100%)`,
                            opacity: 0.85 - idx * 0.12,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold">
                          <span className="text-foreground tabular-nums">{s.count.toLocaleString()}</span>
                          {conv !== null && (
                            <span className="text-muted-foreground tabular-nums">
                              {fmtPct(conv)} ↓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded border bg-background p-2">
                    <div className="text-muted-foreground">Offer → Negotiation</div>
                    <div className="text-lg font-semibold tabular-nums">{fmtPct(offerToNeg)}</div>
                  </div>
                  <div className="rounded border bg-background p-2">
                    <div className="text-muted-foreground">Negotiation → Accept</div>
                    <div className="text-lg font-semibold tabular-nums">{fmtPct(negToAccept)}</div>
                  </div>
                  <div className="rounded border bg-background p-2">
                    <div className="text-muted-foreground">Accept → Order</div>
                    <div className="text-lg font-semibold tabular-nums">{fmtPct(acceptToOrder)}</div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Trend + Status mix */}
          <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-2">Negotiations over time</h2>
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
                    <Line type="monotone" dataKey="started" stroke="#5C8A9E" strokeWidth={2} dot={false} name="Started" />
                    <Line type="monotone" dataKey="accepted" stroke="#7BAA8E" strokeWidth={2} dot={false} name="Accepted" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">Status breakdown</h2>
              {data.statusBreakdown.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
              ) : (
                <ul className="space-y-2">
                  {data.statusBreakdown.map((s) => {
                    const total = data.negotiationsStarted || 1;
                    const pct = (s.count / total) * 100;
                    const color = STATUS_COLORS[s.status] ?? "#888";
                    return (
                      <li key={s.status}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                            <span className="font-medium">{STATUS_LABEL[s.status] ?? s.status}</span>
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {s.count} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted/40 rounded overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Top suppliers */}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Top suppliers by settled GMV</h2>
            {data.topSuppliers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                      <th className="text-left font-medium py-2 pr-2">#</th>
                      <th className="text-left font-medium py-2 pr-2">Supplier</th>
                      <th className="text-right font-medium py-2 pr-2">Offers</th>
                      <th className="text-right font-medium py-2 pr-2">Negotiations</th>
                      <th className="text-right font-medium py-2 pr-2">Accepted</th>
                      <th className="text-right font-medium py-2 pr-2">Conv.</th>
                      <th className="text-right font-medium py-2">GMV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSuppliers.map((s, idx) => {
                      const top = data.topSuppliers[0]?.gmvUsd || 1;
                      const w = (s.gmvUsd / top) * 100;
                      return (
                        <tr key={s.supplierId} className="border-b last:border-0 relative">
                          <td className="py-2 pr-2 text-xs text-muted-foreground">#{idx + 1}</td>
                          <td className="py-2 pr-2 font-medium relative">
                            <span className="absolute inset-y-0 left-0 -z-0 bg-[#7BAA8E]/10 rounded" style={{ width: `${w}%` }} />
                            <span className="relative">{s.supplierName}</span>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">{s.offers}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{s.negotiations}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{s.accepted}</td>
                          <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                            {s.negotiations > 0 ? fmtPct(s.conversion) : "—"}
                          </td>
                          <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(s.gmvUsd)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}