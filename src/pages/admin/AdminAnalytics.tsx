import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Clock, Sparkles,
  ArrowRight, Activity, DollarSign, Handshake, Trophy, Users, Download,
} from "lucide-react";
import {
  useMarketplaceAnalytics, type AnalyticsPeriod, type Kpi, type Insight,
} from "@/hooks/useMarketplaceAnalytics";

const PERIODS: Array<{ value: AnalyticsPeriod; labelKey: string }> = [
  { value: "7d", labelKey: "admin.analytics.period.last7d" },
  { value: "30d", labelKey: "admin.analytics.period.last30d" },
  { value: "90d", labelKey: "admin.analytics.period.last90d" },
  { value: "12m", labelKey: "admin.analytics.period.last12m" },
];

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function DeltaPill({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const sig = inverse ? -value : value;
  if (Math.abs(value) < 0.005) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const up = sig > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(Math.round(value * 100))}%
    </span>
  );
}

function HealthRing({ score }: { score: number }) {
  const radius = 36;
  const c = 2 * Math.PI * radius;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  return (
    <div className="relative h-24 w-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} stroke="hsl(var(--border))" strokeWidth="8" fill="none" />
        <circle
          cx="48" cy="48" r={radius} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <div className="text-xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</div>
      </div>
    </div>
  );
}

function InsightCard({ ins }: { ins: Insight }) {
  const palette = {
    good: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
    warn: "border-amber-200 bg-amber-50/60 text-amber-700",
    info: "border-blue-200 bg-blue-50/60 text-blue-700",
  }[ins.type];
  const Icon = ins.type === "good" ? Sparkles : ins.type === "warn" ? AlertTriangle : Activity;
  return (
    <div className={`rounded-lg border p-3 ${palette}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold">{ins.title}</div>
          <div className="text-xs opacity-80 mt-0.5">{ins.detail}</div>
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  label, value, delta, deltaKind, active, onClick, icon: Icon,
}: {
  label: string;
  value: string;
  delta?: Kpi["delta"];
  deltaKind?: "pct" | "abs";
  active?: boolean;
  onClick?: () => void;
  icon: any;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition bg-card hover:border-[#B64769]/40 ${
        active ? "border-[#B64769] ring-1 ring-[#B64769]/30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-muted-foreground text-[11px] uppercase tracking-wide">
        <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</span>
        {delta !== undefined && <DeltaPill value={delta} />}
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums">{value}</div>
    </button>
  );
}

type MetricKey = "gmv" | "deals";

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [metric, setMetric] = useState<MetricKey>("gmv");
  const q = useMarketplaceAnalytics(period);
  const data = q.data;

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["date", "gmv", "deals", "gmv_prev", "deals_prev"],
      ...data.trend.map((d) => [d.date, d.gmv, d.deals, d.gmvPrev, d.dealsPrev]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mundus-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("admin.analytics.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin.analytics.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-card p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs rounded-sm transition ${
                  period === p.value
                    ? "bg-[#B64769] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border bg-card hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </header>

      {q.isLoading && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      )}
      {q.error && (
        <div className="py-12 text-center text-sm text-rose-600">
          {String((q.error as any)?.message ?? "Error")}
        </div>
      )}

      {data && (
        <>
          {/* Health + Insights */}
          <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <HealthRing score={data.healthScore} />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("admin.analytics.healthTitle")}
                </div>
                <div className="text-sm font-medium">
                  {data.healthScore >= 70
                    ? t("admin.analytics.healthGood")
                    : data.healthScore >= 40
                      ? t("admin.analytics.healthOk")
                      : t("admin.analytics.healthBad")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("admin.analytics.basedOnPeriod")}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.insights.slice(0, 4).map((i) => (
                <InsightCard key={i.id} ins={i} />
              ))}
            </div>
          </section>

          {/* KPI strip */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiTile
              label={t("admin.analytics.kpi.gmv")} icon={DollarSign}
              value={fmtMoney(data.kpis.gmv.value)} delta={data.kpis.gmv.delta}
              active={metric === "gmv"} onClick={() => setMetric("gmv")}
            />
            <KpiTile
              label={t("admin.analytics.kpi.activeDeals")} icon={Handshake}
              value={fmtNum(data.kpis.activeDeals.value)} delta={data.kpis.activeDeals.delta}
              active={metric === "deals"} onClick={() => setMetric("deals")}
            />
            <KpiTile
              label={t("admin.analytics.kpi.winRate")} icon={Trophy}
              value={fmtPct(data.kpis.winRate.value)} delta={data.kpis.winRate.delta}
            />
            <KpiTile
              label={t("admin.analytics.kpi.avgCycle")} icon={Clock}
              value={`${Math.round(data.kpis.avgCycleDays.value)}d`}
            />
            <KpiTile
              label={t("admin.analytics.kpi.avgDealSize")} icon={DollarSign}
              value={fmtMoney(data.kpis.avgDealSize.value)} delta={data.kpis.avgDealSize.delta}
            />
            <KpiTile
              label={t("admin.analytics.kpi.newSignups")} icon={Users}
              value={fmtNum(data.kpis.newSignups.value)} delta={data.kpis.newSignups.delta}
            />
          </section>

          {/* Trend chart */}
          <section className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">
                {metric === "gmv"
                  ? t("admin.analytics.trend.gmv")
                  : t("admin.analytics.trend.deals")}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {t("admin.analytics.vsPrevious")}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="anWine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B64769" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#B64769" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v) =>
                    period === "12m"
                      ? v.slice(5)
                      : new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  }
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))" fontSize={11}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v) => (metric === "gmv" ? fmtMoney(v) : fmtNum(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8, fontSize: 12,
                  }}
                  formatter={(v: number) => (metric === "gmv" ? fmtMoney(v) : fmtNum(v))}
                />
                <Area
                  type="monotone" dataKey={metric === "gmv" ? "gmvPrev" : "dealsPrev"}
                  stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
                  fill="none" strokeWidth={1.5}
                />
                <Area
                  type="monotone" dataKey={metric}
                  stroke="#B64769" fill="url(#anWine)" strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* Funnel + Attention */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">{t("admin.analytics.funnel.title")}</h2>
              <div className="space-y-2.5">
                {data.funnel.map((s, i) => {
                  const top = data.funnel[0]?.count || 1;
                  const w = Math.max(8, (s.count / top) * 100);
                  const dropBad = s.dropoff > 0.5;
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">
                          {t(`admin.analytics.funnel.steps.${s.key}`, { defaultValue: s.label })}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {fmtNum(s.count)}
                          {i > 0 && (
                            <span className={`ml-2 ${dropBad ? "text-rose-600" : "text-muted-foreground"}`}>
                              −{Math.round(s.dropoff * 100)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#B64769]"
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">
                  {t("admin.analytics.attention.title")}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {data.attention.length} {t("admin.analytics.attention.items")}
                </span>
              </div>
              {data.attention.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2" />
                  {t("admin.analytics.attention.empty")}
                </div>
              ) : (
                <ul className="divide-y max-h-[280px] overflow-auto">
                  {data.attention.slice(0, 12).map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => navigate(a.href)}
                        className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-muted/40 px-2 rounded"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            a.severity === "danger" ? "bg-rose-500" : "bg-amber-500"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{a.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{a.subtitle}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Leaderboards */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Leaderboard
              title={t("admin.analytics.top.buyers")}
              rows={data.topBuyers}
              emptyKey={t("admin.analytics.top.empty")}
              onRowClick={(id) => navigate(`/admin/companies/${id}`)}
            />
            <Leaderboard
              title={t("admin.analytics.top.suppliers")}
              rows={data.topSuppliers}
              emptyKey={t("admin.analytics.top.empty")}
              onRowClick={(id) => navigate(`/admin/companies/${id}`)}
            />
          </section>
        </>
      )}
    </div>
  );
}

function Leaderboard({
  title, rows, emptyKey, onRowClick,
}: {
  title: string;
  rows: Array<{ id: string; name: string; gmv: number; deals: number }>;
  emptyKey: string;
  onRowClick: (id: string) => void;
}) {
  const top = rows[0]?.gmv ?? 1;
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">{emptyKey}</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, idx) => (
            <li key={r.id}>
              <button
                onClick={() => onRowClick(r.id)}
                className="w-full text-left flex items-center gap-3 hover:bg-muted/40 px-2 py-1.5 rounded relative"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded bg-[#B64769]/8"
                  style={{ width: `${(r.gmv / top) * 100}%` }}
                />
                <span className="relative w-6 text-xs font-semibold text-muted-foreground">
                  #{idx + 1}
                </span>
                <span className="relative min-w-0 flex-1 text-sm font-medium truncate">
                  {r.name}
                </span>
                <span className="relative text-xs text-muted-foreground tabular-nums">
                  {r.deals}d
                </span>
                <span className="relative text-sm font-semibold tabular-nums">
                  {fmtMoney(r.gmv)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
