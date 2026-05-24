import { useTranslation } from "react-i18next";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

const fmtMoneyShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${v}`;
};
const fmtMoneyExact = (v: number) => `$${v.toLocaleString("en-US")}`;
const fmtPct = (v: number) => `${Math.round(v * 100)}%`;
const fmtPpDelta = (v: number) => `${v > 0 ? "↑" : "↓"}${Math.abs(Math.round(v * 100))}pp`;
const fmtPctDelta = (v: number) => `${v > 0 ? "↑" : "↓"}${Math.abs(Math.round(v * 100))}%`;

function TrendChart({ data }: { data: Array<{ date: string; value: number }> }) {
  const W = 600;
  const H = 120;
  const PAD_L = 4, PAD_R = 6, PAD_T = 8, PAD_B = 8;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xAt = (i: number) => PAD_L + (i / (data.length - 1)) * innerW;
  const yAt = (v: number) => PAD_T + innerH - ((v - min) / range) * innerH;

  const lineD = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(" ");
  const areaD = `${lineD} L${xAt(data.length - 1).toFixed(1)},${(H - PAD_B).toFixed(1)} L${xAt(0).toFixed(1)},${(H - PAD_B).toFixed(1)} Z`;
  const last = data[data.length - 1];

  // grid lines at 25/50/75 of range
  const grid = [0.25, 0.5, 0.75].map((p) => PAD_T + innerH * p);

  // y labels: max, mid, min
  const yLabels = [max, min + range / 2, min];

  return (
    <div className="adm-trend-wrap">
      <div className="adm-trend-yaxis" aria-hidden="true">
        {yLabels.map((v, i) => <span key={i}>{fmtMoneyShort(v)}</span>)}
      </div>
      <div>
        <svg className="adm-trend-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {grid.map((y, i) => (
            <line key={i} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
              stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" strokeDasharray="2,3" />
          ))}
          <path d={areaD} fill="#B64769" fillOpacity="0.08" />
          <path d={lineD} fill="none" stroke="#B64769" strokeWidth="1.5"
                strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={xAt(data.length - 1)} cy={yAt(last.value)} r="3"
                  fill="#B64769" stroke="#fff" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const a = useAdminAnalytics();
  const d = useAdminDashboard();
  const fmtN = (v: number | undefined) => (v === undefined ? "—" : v.toLocaleString("en-US"));

  // pipeline scale
  const pipeMax = a.pipeline[0].count;

  // top lists max
  const buyerMax = Math.max(...a.topBuyers.map((b) => b.gmv));
  const supplierMax = Math.max(...a.topSuppliers.map((s) => s.gmv));
  const destMax = Math.max(...a.destinations.map((d) => d.gmv));
  const portMax = Math.max(...a.originPorts.map((p) => p.tons));

  const rounds = a.negotiationRounds;
  const tta = a.timeToAcceptance;

  return (
    <div className="adm-body">
      {/* page header */}
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">{t("admin.dashboard.title")}</span>
          <span className="adm-page-subtle">· {t("admin.dashboard.subtitle")}</span>
        </div>
        <button type="button" className="adm-range">{t("admin.dashboard.rangeLast30")} ▾</button>
      </div>

      {/* row 1 — KPIs */}
      <div className="adm-kpis">
        <div className="adm-kpi">
          <div className="adm-kpi-label">Companies</div>
          <div className="adm-kpi-value">{fmtN(d.companies)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">Active Offers</div>
          <div className="adm-kpi-value">{fmtN(d.activeOffers)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">Negotiations</div>
          <div className="adm-kpi-value">{fmtN(d.negotiations)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">Orders</div>
          <div className="adm-kpi-value">{fmtN(d.orders)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">Revenue</div>
          <div className="adm-kpi-value">{d.revenue === undefined ? "—" : fmtMoneyShort(d.revenue)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">{t("admin.dashboard.kpi.newSignups")}</div>
          <div className="adm-kpi-value">{a.kpis.newSignups}<span className="adm-kpi-delta up">↑{a.kpis.newSignupsDelta}</span></div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">{t("admin.dashboard.kpi.avgCycle")}</div>
          <div className="adm-kpi-value">{a.kpis.avgCycle} {t("admin.dashboard.kpi.avgCycleSuffix")}<span className="adm-kpi-delta up">↓{Math.abs(a.kpis.avgCycleDelta)}d</span></div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi-label">{t("admin.dashboard.kpi.avgDealSize")}</div>
          <div className="adm-kpi-value">{fmtMoneyShort(a.kpis.avgDealSize)}<span className="adm-kpi-delta up">{fmtPctDelta(a.kpis.avgDealSizeDelta)}</span></div>
        </div>
        <div className="adm-kpi" title={t("admin.dashboard.kpi.liquidityHint")}>
          <div className="adm-kpi-label">{t("admin.dashboard.kpi.liquidity")}</div>
          <div className="adm-kpi-value">{a.kpis.liquidity.toFixed(1)}×</div>
        </div>
      </div>

      {/* row 2 — GMV trend + pipeline */}
      <div className="adm-row-2">
        <div className="adm-panel">
          <div className="adm-panel-h">
            <div>
              <span className="adm-panel-title">{t("admin.dashboard.trend.title")}</span>
              <span className="adm-panel-sub">· {t("admin.dashboard.trend.subtitle")}</span>
            </div>
          </div>
          <TrendChart data={a.gmvTrend} />
          <div className="adm-trend-xaxis">
            <span>{t("admin.dashboard.trend.thirtyDaysAgo")}</span>
            <span>{t("admin.dashboard.trend.today")}</span>
          </div>
        </div>
        <div className="adm-panel">
          <div className="adm-panel-h">
            <span className="adm-panel-title">{t("admin.dashboard.pipeline.title")}</span>
            <a href="#" className="adm-link" onClick={(e) => e.preventDefault()}>{t("admin.dashboard.pipeline.viewAll")}</a>
          </div>
          <div>
            {a.pipeline.map((p, i) => {
              const pct = (p.count / pipeMax) * 100;
              const muted = i >= 3;
              return (
                <div className="adm-pipeline-row" key={p.key}>
                  <span className="adm-pipeline-label">{t(`admin.dashboard.pipeline.${p.key}`)}</span>
                  <div className="adm-pipeline-bar">
                    <div className={`adm-pipeline-fill ${muted ? "muted" : ""}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="adm-pipeline-count">{p.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* row 3 — top buyers + suppliers */}
      <div className="adm-row-2-equal">
        {[
          { title: t("admin.dashboard.topBuyers"), list: a.topBuyers, max: buyerMax },
          { title: t("admin.dashboard.topSuppliers"), list: a.topSuppliers, max: supplierMax },
        ].map((panel, idx) => (
          <div className="adm-panel" key={idx}>
            <div className="adm-panel-h"><span className="adm-panel-title">{panel.title}</span></div>
            <div className="adm-list">
              {panel.list.map((row) => (
                <div className="adm-list-row" key={row.name}>
                  <span className="adm-list-av">{row.initials}</span>
                  <div className="adm-list-meta">
                    <div className="adm-list-top">
                      <span className="adm-list-name">{row.name}</span>
                      <span className="mono">{row.country}</span>
                    </div>
                    <div className="adm-list-bar">
                      <div className="adm-list-bar-fill" style={{ width: `${(row.gmv / panel.max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="adm-list-value">{fmtMoneyShort(row.gmv)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* row 4 — products mix + destinations + rounds */}
      <div className="adm-row-3">
        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.dashboard.productsMix.title")}</span></div>
          <div className="adm-stack">
            <div className="adm-stack-seg" style={{ width: `${a.productsMix.beef}%`, background: "#888780" }} />
            <div className="adm-stack-seg" style={{ width: `${a.productsMix.pork}%`, background: "#5dcaa5" }} />
            <div className="adm-stack-seg" style={{ width: `${a.productsMix.poultry}%`, background: "#fac775" }} />
            <div className="adm-stack-seg" style={{ width: `${a.productsMix.lamb}%`, background: "#f0997b" }} />
          </div>
          <div className="adm-legend">
            {[
              { c: "#888780", k: "beef", v: a.productsMix.beef },
              { c: "#5dcaa5", k: "pork", v: a.productsMix.pork },
              { c: "#fac775", k: "poultry", v: a.productsMix.poultry },
              { c: "#f0997b", k: "lamb", v: a.productsMix.lamb },
            ].map((l) => (
              <span className="adm-legend-item" key={l.k}>
                <span className="adm-legend-sw" style={{ background: l.c }} />
                {t(`admin.dashboard.productsMix.${l.k}`)} <span className="adm-legend-pct">{l.v}%</span>
              </span>
            ))}
          </div>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.dashboard.destinations")}</span></div>
          <div className="adm-list">
            {a.destinations.map((d) => (
              <div key={d.name}>
                <div className="adm-dest-row">
                  <span aria-hidden="true">{d.flag}</span>
                  <span>{d.name}</span>
                  <span className="adm-dest-value">{fmtMoneyShort(d.gmv)}</span>
                </div>
                <div className="adm-dest-bar">
                  <div className="adm-dest-bar-fill" style={{ width: `${(d.gmv / destMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-h">
            <div>
              <span className="adm-panel-title">{t("admin.dashboard.negotiationRounds.title")}</span>
              <span className="adm-panel-sub">· {t("admin.dashboard.negotiationRounds.subtitle")}</span>
            </div>
          </div>
          <div className="adm-vbars">
            {[
              { k: "R1", v: rounds.r1, muted: false },
              { k: "R2", v: rounds.r2, muted: false },
              { k: "R3", v: rounds.r3, muted: true },
            ].map((b) => (
              <div className="adm-vbar" key={b.k}>
                <span className="adm-vbar-val">{b.v}%</span>
                <div className="adm-vbar-track">
                  <div className={`adm-vbar-fill ${b.muted ? "muted" : ""}`} style={{ height: `${b.v * 1.6}%` }} />
                </div>
                <span className="adm-vbar-lbl">{b.k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* row 5 — origin ports + activity */}
      <div className="adm-row-1-3">
        <div className="adm-panel">
          <div className="adm-panel-h">
            <div>
              <span className="adm-panel-title">{t("admin.dashboard.originPorts.title")}</span>
              <span className="adm-panel-sub">· {t("admin.dashboard.originPorts.subtitle")}</span>
            </div>
          </div>
          <div className="adm-list">
            {a.originPorts.map((p) => (
              <div key={p.name}>
                <div className="adm-dest-row">
                  <span style={{ width: 0 }} />
                  <span>{p.name} <span className="mono" style={{ marginLeft: 4 }}>{p.country}</span></span>
                  <span className="adm-dest-value">{(p.tons / 1000).toFixed(0)}k tons · {p.share}%</span>
                </div>
                <div className="adm-dest-bar">
                  <div className="adm-dest-bar-fill" style={{ width: `${(p.tons / portMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.dashboard.activity")}</span></div>
          <div className="adm-activity">
            {a.activity.map((ev) => (
              <div className="adm-activity-row" key={ev.id}>
                <span className={`adm-dot ${ev.type}`} />
                <span className="adm-activity-body">
                  {ev.body}
                  {ev.refId && <> <span className="mono">{ev.refId}</span></>}
                </span>
                <span className="adm-activity-when">{ev.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* row 6 — SLA + TTA + avg by product */}
      <div className="adm-row-3">
        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.dashboard.sla.title")}</span></div>
          <div className="adm-sla-tiles">
            <div className="adm-sla-tile ok"><span className="v">{a.sla.onTime}</span><span className="l">{t("admin.dashboard.sla.onTime")}</span></div>
            <div className="adm-sla-tile warn"><span className="v">{a.sla.atRisk}</span><span className="l">{t("admin.dashboard.sla.atRisk")}</span></div>
            <div className="adm-sla-tile bad"><span className="v">{a.sla.overdue}</span><span className="l">{t("admin.dashboard.sla.overdue")}</span></div>
          </div>
          <a href="#" className="adm-link" onClick={(e) => e.preventDefault()}>{t("admin.dashboard.sla.review")}</a>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-h">
            <div>
              <span className="adm-panel-title">{t("admin.dashboard.tta.title")}</span>
              <span className="adm-panel-sub">· {t("admin.dashboard.tta.subtitle")}</span>
            </div>
          </div>
          <div className="adm-vbars">
            {[
              { k: "<3d", v: tta.lt3 },
              { k: "3-7d", v: tta.d3to7 },
              { k: "8-14d", v: tta.d8to14 },
              { k: "15+d", v: tta.gte15 },
            ].map((b) => (
              <div className="adm-vbar" key={b.k}>
                <span className="adm-vbar-val">{b.v}%</span>
                <div className="adm-vbar-track">
                  <div className="adm-vbar-fill gray" style={{ height: `${b.v * 1.8}%` }} />
                </div>
                <span className="adm-vbar-lbl">{b.k}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-panel">
          <div className="adm-panel-h"><span className="adm-panel-title">{t("admin.dashboard.avgByProduct")}</span></div>
          <div>
            {(["beef", "pork", "poultry", "lamb"] as const).map((k) => (
              <div className="adm-kv-row" key={k}>
                <span>{t(`admin.dashboard.productsMix.${k}`)}</span>
                <span className="v">{fmtMoneyShort(a.avgByProduct[k])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* row 7 — ops queue */}
      <div className="adm-panel">
        <div className="adm-panel-h">
          <span className="adm-panel-title">{t("admin.dashboard.opsQueue.title")}</span>
          <a href="#" className="adm-link" onClick={(e) => e.preventDefault()}>{t("admin.dashboard.opsQueue.viewAll")}</a>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <colgroup>
              <col style={{ width: "38%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>{t("admin.dashboard.opsQueue.company")}</th>
                <th>{t("admin.dashboard.opsQueue.role")}</th>
                <th>{t("admin.dashboard.opsQueue.issue")}</th>
                <th>{t("admin.dashboard.opsQueue.age")}</th>
                <th>{t("admin.dashboard.opsQueue.owner")}</th>
              </tr>
            </thead>
            <tbody>
              {a.opsQueue.map((r) => (
                <tr key={r.code}>
                  <td>
                    <div className="adm-table-company">
                      <span className="adm-table-av">{r.initials}</span>
                      <span className="name">{r.name}</span>
                      <span className="mono">{r.country} · {r.code}</span>
                    </div>
                  </td>
                  <td><span className="pill info">{t(r.role === "buyer" ? "admin.dashboard.opsQueue.roleBuyer" : "admin.dashboard.opsQueue.roleSupplier")}</span></td>
                  <td><span className={`pill ${r.issueLevel}`}>{t(`admin.dashboard.opsQueue.${r.issue}`)}</span></td>
                  <td>{r.age ?? "—"}</td>
                  <td>{r.owner ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// silence unused-export warning for fmtMoneyExact
void fmtMoneyExact;