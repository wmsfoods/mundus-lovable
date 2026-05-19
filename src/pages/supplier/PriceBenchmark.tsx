import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  Cell,
} from "recharts";
import {
  ChevronDown,
  Download,
  TrendingDown,
  Timer,
  Award,
  Zap,
  Lock,
  Star,
} from "lucide-react";
import { PreviewBanner } from "@/components/mundus/PreviewBanner";
import { useSupplierPriceBenchmark } from "@/hooks/useSupplierInsights";

const ICONS = { TrendingDown, Timer, Award, Zap } as const;

export default function PriceBenchmark() {
  const { t } = useTranslation();
  const d = useSupplierPriceBenchmark();

  return (
    <div className="ins-page">
      <div className="ins-header">
        <div className="ins-header__top">
          <div>
            <div className="ins-eyebrow">
              {t("supplier.insights.priceBenchmark.eyebrow")}
            </div>
            <h1 className="ins-h1">
              {t("supplier.insights.priceBenchmark.title", { cut: d.cut })}
            </h1>
            <p className="ins-subtitle">
              {t("supplier.insights.priceBenchmark.subtitle", {
                count: d.totalCompetingOffers,
              })}
            </p>
          </div>
          <div className="ins-header__actions">
            <button type="button" className="ins-btn">
              {d.cut} · {d.origin} · {d.condition}
              <ChevronDown size={14} />
            </button>
            <button type="button" className="ins-btn">
              <Download size={14} />
              {t("common.export", { defaultValue: "Export" })}
            </button>
          </div>
        </div>
      </div>

      <PreviewBanner />

      {/* Hero */}
      <div className="pb-hero">
        <div>
          <h2 className="pb-hero__h2">
            {t("supplier.insights.priceBenchmark.hero.before")}{" "}
            <strong>8.2% above</strong>{" "}
            {t("supplier.insights.priceBenchmark.hero.after")}
          </h2>
          <p className="pb-hero__body">
            {t("supplier.insights.priceBenchmark.hero.body", {
              price: d.yourPrice.toFixed(2),
              percentile: d.yourPercentile,
              total: d.totalCompetingOffers,
              suggested: "16.60",
            })}
          </p>
        </div>
        <div className="pb-hero__panel">
          <span className="pb-hero__panel-label">
            {t("supplier.insights.priceBenchmark.yourPrice")}
          </span>
          <span className="pb-hero__panel-value">
            ${d.yourPrice.toFixed(2)}/kg
          </span>
          <span className="pb-hero__panel-sub">
            P{d.yourPercentile} · above median
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="pb-stats">
        <Stat label="Market median" value={`$${d.marketMedian.toFixed(2)}/kg`} sub={`${d.totalCompetingOffers} offers · 7d`} />
        <Stat label="Market low" value={`$${d.marketLow.toFixed(2)}/kg`} sub="P10 · sub-premium grade" />
        <Stat label="Market high" value={`$${d.marketHigh.toFixed(2)}/kg`} sub="P90 · organic grass-fed" />
        <Stat
          label="Avg lead time"
          value={`${d.avgLeadTime} days`}
          sub={`you: ${d.yourLeadTime} days · +${d.yourLeadTime - d.avgLeadTime}d`}
          subTone="warn"
        />
        <Stat
          label="Avg min order"
          value={`${d.avgMinOrder} t`}
          sub={`you: ${d.yourMinOrder} t · on par`}
          subTone="ok"
        />
      </div>

      <div className="pb-main">
        <div className="pb-main__left">
          {/* Histogram */}
          <div className="ins-card">
            <div className="ins-card__head">
              <div>
                <h3 className="ins-card__title">
                  {t("supplier.insights.priceBenchmark.distribution.title")}
                </h3>
                <p className="ins-card__subtitle">
                  {t("supplier.insights.priceBenchmark.distribution.subtitle", {
                    count: d.totalCompetingOffers,
                  })}
                </p>
              </div>
              <span className="ins-card__hint">
                Bucket: $0.40 · vertical line = your price
              </span>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={d.histogramBuckets} margin={{ top: 24, right: 12, bottom: 8, left: 0 }}>
                  <XAxis
                    dataKey="price"
                    tickFormatter={(v) => `$${v.toFixed(2)}`}
                    tick={{ fontSize: 11, fill: "var(--g500)" }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--g500)" }}
                    stroke="hsl(var(--border))"
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                    formatter={(v: number) => [`${v} offers`, "Count"]}
                    labelFormatter={(l) => `$${Number(l).toFixed(2)}/kg`}
                  />
                  <ReferenceLine x={d.p25} stroke="var(--g500)" strokeDasharray="3 3" label={{ value: "P25", position: "top", fontSize: 10, fill: "var(--g500)" }} />
                  <ReferenceLine x={d.marketMedian} stroke="var(--g700)" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: "Median", position: "top", fontSize: 10, fill: "var(--g700)" }} />
                  <ReferenceLine x={d.p75} stroke="var(--g500)" strokeDasharray="3 3" label={{ value: "P75", position: "top", fontSize: 10, fill: "var(--g500)" }} />
                  <ReferenceLine x={d.yourPrice} stroke="#B64769" strokeWidth={2} label={{ value: `You · $${d.yourPrice.toFixed(2)} (P${d.yourPercentile})`, position: "top", fontSize: 10, fill: "#B64769", fontWeight: 600 }} />
                  <Bar dataKey="count" fill="#FFECEC" stroke="#B64769" strokeWidth={1} radius={[2, 2, 0, 0]}>
                    {d.histogramBuckets.map((b, i) => (
                      <Cell
                        key={i}
                        fill={b.highlighted ? "#F8CDD7" : "#FFECEC"}
                        stroke={b.highlighted ? "#8a3550" : "#B64769"}
                        strokeWidth={b.highlighted ? 2 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="pb-legend">
              <span className="pb-legend__item">
                <span className="pb-legend__sw" /> Competitor offers
              </span>
              <span className="pb-legend__item">
                <span className="pb-legend__line" /> Market median
              </span>
              <span className="pb-legend__item">
                <span className="pb-legend__line pb-legend__line--solid" /> Your offer
              </span>
            </div>
          </div>

          {/* Ranking */}
          <div className="ins-card">
            <div className="ins-card__head">
              <div>
                <h3 className="ins-card__title">Anonymized offer ranking</h3>
                <p className="ins-card__subtitle">sorted by view count · 7d · competitors blurred</p>
              </div>
            </div>
            <table className="pb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Supplier</th>
                  <th>Price /kg</th>
                  <th>Lead</th>
                  <th>Views</th>
                  <th>Chats</th>
                </tr>
              </thead>
              <tbody>
                {d.ranking.map((r) => (
                  <tr key={r.rank} className={r.isYou ? "is-you" : ""}>
                    <td>
                      {r.isYou && <Star size={12} color="#B64769" fill="#B64769" style={{ marginRight: 4, verticalAlign: "middle" }} />}
                      {r.rank}
                    </td>
                    <td>
                      {r.isYou ? (
                        <strong>You</strong>
                      ) : (
                        <span className="pb-table__chip">{r.supplier}</span>
                      )}
                    </td>
                    <td>${r.price.toFixed(2)}</td>
                    <td>{r.lead}d</td>
                    <td>{r.views.toLocaleString()}</td>
                    <td>{r.chats}</td>
                  </tr>
                ))}
                <tr className="is-collapsed">
                  <td colSpan={6}>… 33 more offers — $18.00–19.80 · 22–28d</td>
                </tr>
              </tbody>
            </table>
            <div className="pb-table__footer">
              <Lock size={12} />
              <span>Supplier names are anonymized per Mundus' fair-competition policy. Rankings refresh every 24h.</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <aside className="pb-recs">
          <div className="pb-recs__title">Recommendations</div>
          {d.recommendations.map((r) => {
            const I = ICONS[r.icon];
            return (
              <div key={r.id} className="pb-rec">
                <span className="pb-rec__icon">
                  <I size={16} />
                </span>
                <div className="pb-rec__body">
                  <div className="pb-rec__title">{r.title}</div>
                  <div className="pb-rec__text">{r.body}</div>
                  <span className="pb-rec__pill">{r.impact}</span>
                </div>
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub: string;
  subTone?: "warn" | "ok";
}) {
  return (
    <div className="pb-stat">
      <div className="pb-stat__label">{label}</div>
      <div className="pb-stat__value">{value}</div>
      <div className={`pb-stat__sub ${subTone === "warn" ? "pb-stat__sub--warn" : subTone === "ok" ? "pb-stat__sub--ok" : ""}`.trim()}>
        {sub}
      </div>
    </div>
  );
}