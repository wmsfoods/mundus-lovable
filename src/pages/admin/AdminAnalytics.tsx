import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import {
  useAdminAnalyticsTraffic,
  type AnalyticsPeriod, type AnalyticsMetric,
  type AnalyticsFilter, type BreakdownDim, type BreakdownRow,
} from "@/hooks/useAdminAnalyticsTraffic";
import { Modal } from "@/components/mundus/Modal";

const PERIODS: Array<{ value: AnalyticsPeriod; labelKey: string }> = [
  { value: "realtime", labelKey: "admin.analytics.period.realtime" },
  { value: "24h", labelKey: "admin.analytics.period.last24h" },
  { value: "7d", labelKey: "admin.analytics.period.last7d" },
  { value: "30d", labelKey: "admin.analytics.period.last30d" },
  { value: "90d", labelKey: "admin.analytics.period.last90d" },
];

const METRIC_KEYS: AnalyticsMetric[] = ["visitors", "pageviews", "viewsPerVisit", "duration", "bounceRate"];

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}
function fmtPct(v: number): string { return `${Math.round(v * 100)}%`; }
function fmtDelta(v: number): { text: string; cls: string } {
  if (Math.abs(v) < 0.005) return { text: "0%", cls: "neutral" };
  return { text: `${v > 0 ? "↑" : "↓"} ${Math.abs(Math.round(v * 100))}%`, cls: v > 0 ? "up" : "down" };
}
function fmtMetricValue(metric: AnalyticsMetric, value: number): string {
  if (metric === "duration") return fmtDuration(value);
  if (metric === "bounceRate") return fmtPct(value);
  if (metric === "viewsPerVisit") return value.toFixed(1);
  return fmtNum(value);
}

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [metric, setMetric] = useState<AnalyticsMetric>("visitors");
  const [filters, setFilters] = useState<AnalyticsFilter[]>([]);
  const [detailDim, setDetailDim] = useState<BreakdownDim | null>(null);
  const [tick, setTick] = useState(0);

  // Auto-refresh for realtime/24h
  useEffect(() => {
    if (period !== "realtime" && period !== "24h") return;
    const id = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, [period]);

  const data = useAdminAnalyticsTraffic(period, filters);
  // tick triggers re-render but mock returns deterministic values; left for future real data
  void tick;

  const addFilter = (dim: BreakdownDim, row: BreakdownRow) => {
    setFilters((prev) => {
      if (prev.find((f) => f.dim === dim && f.key === row.key)) return prev;
      return [...prev, { dim, key: row.key, label: row.label }];
    });
  };
  const removeFilter = (f: AnalyticsFilter) => {
    setFilters((prev) => prev.filter((x) => !(x.dim === f.dim && x.key === f.key)));
  };

  const chartData = useMemo(() => {
    return data.trend.map((d, i) => ({
      date: d.date,
      label: formatTick(d.date, period),
      current: d[metric] as number,
      previous: (data.prevTrend[i]?.[metric] as number) ?? 0,
    }));
  }, [data, metric, period]);

  const exportCsv = () => {
    const rows = [
      ["date", "visitors", "pageviews", "viewsPerVisit", "duration_s", "bounceRate"],
      ...data.trend.map((d) => [
        d.date, d.visitors, d.pageviews, d.viewsPerVisit, d.duration, (d.bounceRate * 100).toFixed(1) + "%",
      ]),
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
    <div className="an-page">
      <header className="an-header">
        <div>
          <h1>{t("admin.analytics.title")}</h1>
          {filters.length > 0 && (
            <div className="an-filters" style={{ marginTop: 8 }}>
              {filters.map((f) => (
                <span key={`${f.dim}-${f.key}`} className="an-chip">
                  <strong>{t(`admin.analytics.dim.${f.dim}`)}</strong> = {f.label}
                  <button onClick={() => removeFilter(f)} aria-label="Remove filter">×</button>
                </span>
              ))}
              <button className="an-chip" onClick={() => setFilters([])} style={{ cursor: "pointer" }}>
                {t("admin.analytics.clearAll")}
              </button>
            </div>
          )}
        </div>
        <div className="an-header-right">
          <span className="an-live">
            <span className="an-live-dot" />
            {t("admin.analytics.currentVisitors", { count: data.currentVisitors })}
          </span>
          <select
            className="an-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
            ))}
          </select>
          <button className="an-export" onClick={exportCsv} title={t("admin.analytics.export")}>
            <Download size={14} /> CSV
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="an-kpis">
        {METRIC_KEYS.map((m) => {
          const k = data.kpis[m];
          const isInverse = m === "bounceRate"; // lower is better
          const delta = fmtDelta(isInverse ? -k.delta : k.delta);
          return (
            <button
              key={m}
              className={`an-kpi ${metric === m ? "is-active" : ""}`}
              onClick={() => setMetric(m)}
            >
              <span className="an-kpi-label">{t(`admin.analytics.metric.${m}`)}</span>
              <span className="an-kpi-value">{fmtMetricValue(m, k.value)}</span>
              <span className={`an-kpi-delta ${delta.cls}`}>{delta.text}</span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="an-chart-card">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => fmtMetricValue(metric, v)} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, name: string) => [fmtMetricValue(metric, v), name === "current" ? t("admin.analytics.current") : t("admin.analytics.previous")]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area type="monotone" dataKey="previous" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
            <Area type="monotone" dataKey="current" stroke="#3b82f6" fill="url(#anGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdowns */}
      <div className="an-breakdowns">
        {(["source", "page", "country", "device"] as const).map((dim) => (
          <BreakdownPanel
            key={dim}
            dim={dim}
            rows={data.breakdowns[dim]}
            onPick={(row) => addFilter(dim, row)}
            onDetails={() => setDetailDim(dim)}
          />
        ))}
      </div>

      {/* Detail modal */}
      {detailDim && (
        <DetailModal
          dim={detailDim}
          rows={data.breakdowns[detailDim]}
          onClose={() => setDetailDim(null)}
          onPick={(row) => { addFilter(detailDim, row); setDetailDim(null); }}
        />
      )}
    </div>
  );
}

function BreakdownPanel({
  dim, rows, onPick, onDetails,
}: {
  dim: BreakdownDim;
  rows: BreakdownRow[];
  onPick: (r: BreakdownRow) => void;
  onDetails: () => void;
}) {
  const { t } = useTranslation();
  const top = rows[0]?.visitors ?? 1;
  const display = rows.slice(0, 10);

  return (
    <div className="an-bd">
      <div className="an-bd-head">
        <span className="an-bd-title">{t(`admin.analytics.dim.${dim}`)}</span>
        <span className="an-bd-sub">{t("admin.analytics.visitorsLabel")}</span>
      </div>
      <div className="an-bd-list">
        {display.length === 0 && <div className="an-empty">{t("admin.analytics.empty")}</div>}
        {display.map((row) => (
          <button
            key={row.key}
            className="an-bd-row"
            style={{ ["--bar" as string]: `${(row.visitors / top) * 100}%` }}
            onClick={() => onPick(row)}
          >
            <span className="an-bd-row-label">
              {row.flag && <span>{row.flag}</span>}
              <span>{row.label}</span>
            </span>
            <span className="an-bd-row-value">{fmtNum(row.visitors)}</span>
          </button>
        ))}
      </div>
      {rows.length > 10 && (
        <button className="an-bd-details" onClick={onDetails}>
          {t("admin.analytics.details")} →
        </button>
      )}
    </div>
  );
}

function DetailModal({
  dim, rows, onClose, onPick,
}: {
  dim: BreakdownDim;
  rows: BreakdownRow[];
  onClose: () => void;
  onPick: (r: BreakdownRow) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => r.label.toLowerCase().includes(q.toLowerCase()));
  const top = rows[0]?.visitors ?? 1;
  return (
    <Modal open onClose={onClose} width={560} ariaLabel="Breakdown details">
      <div className="an-detail-title">{t(`admin.analytics.dim.${dim}`)}</div>
      <div className="an-detail-body">
        <input
          className="an-detail-search"
          placeholder={t("admin.analytics.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="an-bd-list">
          {filtered.map((row) => (
            <button
              key={row.key}
              className="an-bd-row"
              style={{ ["--bar" as string]: `${(row.visitors / top) * 100}%` }}
              onClick={() => onPick(row)}
            >
              <span className="an-bd-row-label">
                {row.flag && <span>{row.flag}</span>}
                <span>{row.label}</span>
              </span>
              <span className="an-bd-row-value">{fmtNum(row.visitors)}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="an-empty">{t("admin.analytics.empty")}</div>}
        </div>
      </div>
    </Modal>
  );
}

function formatTick(iso: string, period: AnalyticsPeriod): string {
  const d = new Date(iso);
  if (period === "realtime" || period === "24h") {
    return `${String(d.getHours()).padStart(2, "0")}:00`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
