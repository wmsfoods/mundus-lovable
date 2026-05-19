import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
import { PreviewBanner } from "@/components/mundus/PreviewBanner";
import { useSupplierAnalytics } from "@/hooks/useSupplierInsights";

const PERIODS = ["7d", "30d", "90d", "YTD"] as const;

const FUNNEL_COLORS = ["#D75C77", "#C23C60", "#B64769", "#A22E50", "#752642"];

export default function SupplierAnalytics() {
  const { t } = useTranslation();
  const d = useSupplierAnalytics();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("30d");
  const maxFunnel = d.funnel[0].count;
  const maxGeo = Math.max(...d.buyerGeography.map((g) => g.count));

  return (
    <div className="ins-page">
      <div className="ins-header">
        <div className="ins-header__top">
          <div>
            <h1 className="ins-h1">{t("supplier.insights.analytics.title")}</h1>
            <p className="ins-subtitle">{t("supplier.insights.analytics.subtitle")}</p>
          </div>
          <div className="ins-header__actions">
            <div className="sa-segmented" role="tablist">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`sa-segmented__btn ${period === p ? "is-active" : ""}`.trim()}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <button type="button" className="ins-btn">
              <Download size={14} />
              {t("common.export", { defaultValue: "Export" })}
            </button>
          </div>
        </div>
      </div>

      <PreviewBanner />

      {/* KPIs */}
      <div className="sa-kpis">
        {d.kpis.map((k) => {
          const Arrow = k.trend === "good" ? TrendingDown : TrendingUp;
          return (
            <div key={k.label} className="sa-kpi">
              <div className="sa-kpi__label">{k.label}</div>
              <div className="sa-kpi__value">{k.value}</div>
              <div className="sa-kpi__delta">
                <Arrow size={12} />
                {k.delta}
                <span className="sa-kpi__delta-label">{k.deltaLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 */}
      <div className="sa-row sa-row--14-1">
        <div className="ins-card">
          <div className="ins-card__head">
            <div>
              <h3 className="ins-card__title">Conversion funnel</h3>
              <p className="ins-card__subtitle">offer → order</p>
            </div>
          </div>
          <div className="sa-funnel">
            {d.funnel.map((f, i) => {
              const pct = (f.count / maxFunnel) * 100;
              return (
                <div key={f.stage} className="sa-funnel__row">
                  <div className="sa-funnel__label">{f.stage}</div>
                  <div className="sa-funnel__bar-wrap">
                    <div
                      className="sa-funnel__bar"
                      style={{ width: `${Math.max(pct, 4)}%`, background: FUNNEL_COLORS[i] }}
                    >
                      {f.count.toLocaleString()}
                    </div>
                  </div>
                  <div className={`sa-funnel__conv ${f.conversion == null ? "sa-funnel__conv--muted" : ""}`.trim()}>
                    {f.conversion == null ? "—" : `${f.conversion}%`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ins-card">
          <div className="ins-card__head">
            <div>
              <h3 className="ins-card__title">Top products</h3>
              <p className="ins-card__subtitle">by revenue</p>
            </div>
          </div>
          <div className="sa-top">
            {d.topProducts.map((p) => (
              <div key={p.rank} className="sa-top__row">
                <span className="sa-top__rank">{p.rank}</span>
                <div>
                  <div className="sa-top__name">{p.name}</div>
                  <div className="sa-top__sub">{p.orders} orders · {p.tons}t</div>
                </div>
                <div className="sa-top__rev">{p.revenue}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="sa-row sa-row--1-1">
        <div className="ins-card">
          <div className="ins-card__head">
            <div>
              <h3 className="ins-card__title">Buyer geography</h3>
              <p className="ins-card__subtitle">orders by destination</p>
            </div>
          </div>
          <div className="sa-geo">
            {d.buyerGeography.map((g) => (
              <div key={g.country} className="sa-geo__row">
                <div className="sa-geo__country">{g.country}</div>
                <div className="sa-geo__count">{g.count}</div>
                <div className="sa-geo__track">
                  <div className="sa-geo__fill" style={{ width: `${(g.count / maxGeo) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ins-card">
          <div className="ins-card__head">
            <div>
              <h3 className="ins-card__title">GMV trend</h3>
              <p className="ins-card__subtitle">daily, USD thousands</p>
            </div>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={d.gmvTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gmv-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B64769" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#B64769" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--g500)" }}
                  stroke="hsl(var(--border))"
                  interval={6}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--g500)" }} stroke="hsl(var(--border))" width={32} tickFormatter={(v) => `$${v}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  formatter={(v: number) => [`$${v}k`, "GMV"]}
                />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  stroke="#B64769"
                  strokeWidth={1.5}
                  fill="url(#gmv-grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}