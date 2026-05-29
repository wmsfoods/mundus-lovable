import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import {
  DollarSign, Handshake, Package, ShoppingCart, Inbox, TrendingUp, Target,
  ArrowRight, Users, Building2, PiggyBank,
} from "lucide-react";
import { DateRangePills, type BIDateRange } from "@/components/admin/bi/DateRangePills";
import { KpiCard } from "@/components/admin/bi/KpiCard";
import { useMarketIntelligence } from "@/hooks/useMarketIntelligence";
import { useNegotiationFunnel, pctDelta } from "@/hooks/useNegotiationFunnel";
import { useBuyerDemand } from "@/hooks/useBuyerDemand";

const TAKE_RATE = 0.003; // 0.30%

function fmtMoney(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
function fmtKg(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M kg`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k kg`;
  return `${Math.round(n)} kg`;
}
function fmtPct(n: number): string {
  if (!isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
function fmtNum(n: number): string {
  return n.toLocaleString();
}

export default function AdminBIOverview() {
  const [range, setRange] = useState<BIDateRange>("30d");
  const market = useMarketIntelligence(range);
  const funnel = useNegotiationFunnel(range);
  const demand = useBuyerDemand(range);

  const loading = market.isLoading || funnel.isLoading || demand.isLoading;
  const m = market.data;
  const f = funnel.data;
  const d = demand.data;

  // Derived KPIs
  const gmv = f?.totalSettledUsd ?? 0;
  const prevGmv = f?.prev.totalSettledUsd ?? 0;
  const revenue = gmv * TAKE_RATE;
  const prevRevenue = prevGmv * TAKE_RATE;
  const conversionRate = f && f.negotiationsStarted > 0
    ? f.negotiationsAccepted / f.negotiationsStarted : 0;
  const offersListed = m?.offersCount ?? 0;

  // Combined activity trend (merge buckets across hooks)
  const activity = useMemo(() => {
    const map = new Map<string, { bucket: string; offers: number; negotiations: number; requests: number }>();
    const touch = (k: string) => {
      let r = map.get(k);
      if (!r) { r = { bucket: k, offers: 0, negotiations: 0, requests: 0 }; map.set(k, r); }
      return r;
    };
    if (m?.priceTrend) {
      const seen = new Map<string, number>();
      for (const p of m.priceTrend) {
        seen.set(p.bucket, (seen.get(p.bucket) ?? 0) + (p.volume > 0 ? 1 : 0));
      }
      for (const [k, v] of seen) touch(k).offers = v;
    }
    if (f?.trend) for (const p of f.trend) touch(p.bucket).negotiations = p.started;
    if (d?.trend) for (const p of d.trend) touch(p.bucket).requests = p.requests;
    return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [m, f, d]);

  // Cross-side top performers
  const topSuppliers = (f?.topSuppliers ?? []).slice(0, 5);
  const topBuyers = (d?.topBuyers ?? []).slice(0, 5);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Hero header */}
      <header
        className="rounded-2xl p-5 md:p-7 text-white relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #4A1830 0%, #6B1F3A 45%, #8B2E48 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
              Mundus Business Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Executive Overview</h1>
            <p className="text-sm text-white/75 mt-1 max-w-xl">
              Real-time consolidated view of marketplace activity, conversion funnel,
              demand signals and projected revenue.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-md p-0.5 border border-white/20">
            <DateRangePills value={range} onChange={setRange} />
          </div>
        </div>
      </header>

      {loading && !m && !f && !d && (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      )}

      {/* Top financial KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Settled GMV"
          value={fmtMoney(gmv)}
          delta={pctDelta(gmv, prevGmv)}
          icon={DollarSign}
          hint="Closed deal value"
        />
        <KpiCard
          label="Projected revenue"
          value={fmtMoney(revenue)}
          delta={pctDelta(revenue, prevRevenue)}
          icon={PiggyBank}
          hint={`Take rate ${(TAKE_RATE * 100).toFixed(2)}%`}
        />
        <KpiCard
          label="Volume traded"
          value={fmtKg(m?.totalVolumeKg ?? 0)}
          delta={pctDelta(m?.totalVolumeKg ?? 0, m?.prev.volumeKg ?? 0)}
          icon={Package}
          hint={`${fmtNum(offersListed)} offers listed`}
        />
        <KpiCard
          label="Avg price"
          value={fmtMoney(m?.avgPriceUsd ?? 0) + "/kg"}
          delta={pctDelta(m?.avgPriceUsd ?? 0, m?.prev.avgPrice ?? 0)}
          icon={TrendingUp}
        />
      </section>

      {/* Activity & engagement KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Buyer requests"
          value={fmtNum(d?.totalRequests ?? 0)}
          delta={pctDelta(d?.totalRequests ?? 0, d?.prev.totalRequests ?? 0)}
          icon={Inbox}
          hint={`Fulfill ${fmtPct(d?.fulfillRate ?? 0)}`}
        />
        <KpiCard
          label="Negotiations"
          value={fmtNum(f?.negotiationsStarted ?? 0)}
          delta={pctDelta(f?.negotiationsStarted ?? 0, f?.prev.negotiationsStarted ?? 0)}
          icon={Handshake}
          hint={`${fmtPct(conversionRate)} accept rate`}
        />
        <KpiCard
          label="Orders"
          value={fmtNum(f?.ordersCreated ?? 0)}
          delta={pctDelta(f?.ordersCreated ?? 0, f?.prev.ordersCreated ?? 0)}
          icon={ShoppingCart}
          hint={`Avg ${(f?.avgRounds ?? 0).toFixed(1)} rounds`}
        />
        <KpiCard
          label="Active buyers"
          value={fmtNum(topBuyers.length > 0 ? (d?.topBuyers.length ?? 0) : 0)}
          icon={Users}
          hint={`${fmtNum(d?.newBuyers ?? 0)} new this period`}
        />
      </section>

      {/* Marketplace activity chart */}
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Marketplace activity</h2>
          <div className="text-[11px] text-muted-foreground">
            Offers · Negotiations · Requests
          </div>
        </div>
        {activity.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={activity} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOffers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5C8A9E" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#5C8A9E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradNegs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B64769" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#B64769" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReqs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E89B6B" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#E89B6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11}
                tickLine={false} axisLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="offers" stroke="#5C8A9E" fill="url(#gradOffers)" strokeWidth={2} name="Offer days" />
              <Area type="monotone" dataKey="negotiations" stroke="#B64769" fill="url(#gradNegs)" strokeWidth={2} name="Negotiations" />
              <Area type="monotone" dataKey="requests" stroke="#E89B6B" fill="url(#gradReqs)" strokeWidth={2} name="Requests" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Funnel snapshot + Revenue projection */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Conversion snapshot</h2>
            <Link to="/admin/bi/negotiations" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Funnel detail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {f && f.funnel[0].count > 0 ? (
            <div className="space-y-2">
              {f.funnel.map((s, idx) => {
                const top = f.funnel[0].count || 1;
                const w = Math.max(4, (s.count / top) * 100);
                const prev = idx > 0 ? f.funnel[idx - 1].count : null;
                const conv = prev && prev > 0 ? s.count / prev : null;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-36 text-xs font-medium shrink-0">{s.label}</div>
                    <div className="flex-1 relative h-7 bg-muted/40 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded"
                        style={{
                          width: `${w}%`,
                          background: "linear-gradient(90deg, #B64769 0%, #E89B6B 100%)",
                          opacity: 0.85 - idx * 0.12,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-semibold">
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
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">No funnel data.</div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Revenue projection
            </h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-gradient-to-br from-[#4A1830] to-[#8B2E48] p-4 text-white">
              <div className="text-[10px] uppercase tracking-wide text-white/70">This period</div>
              <div className="text-2xl font-semibold mt-1 tabular-nums">{fmtMoney(revenue)}</div>
              <div className="text-[11px] text-white/70 mt-1">
                {fmtMoney(gmv)} GMV × {(TAKE_RATE * 100).toFixed(2)}%
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border bg-background p-2">
                <div className="text-[10px] text-muted-foreground uppercase">Previous</div>
                <div className="text-sm font-semibold tabular-nums">{fmtMoney(prevRevenue)}</div>
              </div>
              <div className="rounded border bg-background p-2">
                <div className="text-[10px] text-muted-foreground uppercase">Variation</div>
                <div className={`text-sm font-semibold tabular-nums ${revenue >= prevRevenue ? "text-emerald-600" : "text-rose-600"}`}>
                  {prevRevenue > 0 ? `${(((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)}%` : "—"}
                </div>
              </div>
            </div>
            <div className="rounded border bg-background p-2">
              <div className="text-[10px] text-muted-foreground uppercase">Run-rate (annualized)</div>
              <div className="text-sm font-semibold tabular-nums">
                {fmtMoney(revenue * (365 / Math.max(1, f?.rangeDays ?? 30)))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top counterparties */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Top suppliers
            </h2>
            <Link to="/admin/bi/negotiations" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topSuppliers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No data.</div>
          ) : (
            <ul className="space-y-2">
              {topSuppliers.map((s, idx) => {
                const top = topSuppliers[0].gmvUsd || 1;
                const w = (s.gmvUsd / top) * 100;
                return (
                  <li key={s.supplierId} className="relative">
                    <div className="absolute inset-y-0 left-0 bg-[#7BAA8E]/10 rounded" style={{ width: `${w}%` }} />
                    <div className="relative flex items-center justify-between px-2 py-1.5 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground tabular-nums w-5">#{idx + 1}</span>
                        <span className="font-medium truncate">{s.supplierName}</span>
                      </span>
                      <span className="flex items-center gap-3 text-xs shrink-0">
                        <span className="text-muted-foreground tabular-nums">{s.accepted}/{s.negotiations}</span>
                        <span className="font-semibold tabular-nums">{fmtMoney(s.gmvUsd)}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Top buyers
            </h2>
            <Link to="/admin/bi/demand" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Demand detail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topBuyers.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No data.</div>
          ) : (
            <ul className="space-y-2">
              {topBuyers.map((b, idx) => {
                const top = topBuyers[0].targetValueUsd || 1;
                const w = (b.targetValueUsd / top) * 100;
                return (
                  <li key={b.buyerId} className="relative">
                    <div className="absolute inset-y-0 left-0 bg-[#5C8A9E]/10 rounded" style={{ width: `${w}%` }} />
                    <div className="relative flex items-center justify-between px-2 py-1.5 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground tabular-nums w-5">#{idx + 1}</span>
                        <span className="font-medium truncate">{b.buyerName}</span>
                      </span>
                      <span className="flex items-center gap-3 text-xs shrink-0">
                        <span className="text-muted-foreground tabular-nums">{b.fulfilled}/{b.requests}</span>
                        <span className="font-semibold tabular-nums">{fmtMoney(b.targetValueUsd)}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Protein mix + Top destinations summary */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Protein mix (by volume)</h2>
            <Link to="/admin/bi/market" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Market detail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(m?.proteinMix?.length ?? 0) === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No data.</div>
          ) : (
            <ul className="space-y-2">
              {m!.proteinMix.slice(0, 6).map((p) => {
                const color =
                  p.protein === "beef" ? "#B64769" :
                  p.protein === "pork" ? "#E89B6B" :
                  p.protein === "chicken" ? "#F2C94C" :
                  p.protein === "lamb" ? "#7BAA8E" : "#5C8A9E";
                return (
                  <li key={p.protein}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                        <span className="font-medium capitalize">{p.protein}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {fmtKg(p.volumeKg)} · {(p.share * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/40 rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${p.share * 100}%`, background: color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Top destinations</h2>
            <Link to="/admin/bi/demand" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(d?.destinations?.length ?? 0) === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No data.</div>
          ) : (
            <ul className="space-y-2">
              {d!.destinations.slice(0, 6).map((dest, idx) => {
                const top = d!.destinations[0].requests || 1;
                const w = (dest.requests / top) * 100;
                return (
                  <li key={dest.country || idx} className="relative">
                    <div className="absolute inset-y-0 left-0 bg-[#E89B6B]/15 rounded" style={{ width: `${w}%` }} />
                    <div className="relative flex items-center justify-between px-2 py-1.5 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground tabular-nums w-5">#{idx + 1}</span>
                        <span className="font-medium truncate">{dest.country || "—"}</span>
                      </span>
                      <span className="flex items-center gap-3 text-xs shrink-0">
                        <span className="text-muted-foreground tabular-nums">{dest.requests} req</span>
                        <span className="font-semibold tabular-nums">{fmtMoney(dest.targetValueUsd)}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* GMV vs Revenue trendline */}
      {f?.trend && f.trend.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Accepted negotiations trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={f.trend} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11}
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
        </section>
      )}
    </div>
  );
}