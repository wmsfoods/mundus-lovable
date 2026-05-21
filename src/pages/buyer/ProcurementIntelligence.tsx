import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  Sparkles,
  TrendingDown,
  Info,
  Wallet,
  AlertTriangle,
} from "lucide-react";

const PERIODS = ["30d", "YTD 2024", "2023"] as const;

const MONTHLY = [
  { m: "Jan", v: 4 },
  { m: "Feb", v: 6.2 },
  { m: "Mar", v: 8 },
  { m: "Apr", v: 12 },
  { m: "May", v: 15 },
  { m: "Jun", v: 18 },
  { m: "Jul", v: 22 },
  { m: "Aug", v: 28.4 },
  { m: "Sep", v: 25 },
  { m: "Oct", v: 24 },
  { m: "Nov", v: 22 },
  { m: "Dec", v: 20 },
];

const KPIS = [
  { label: "YTD SPEND", value: "$ 4.2M", sub: "128 orders" },
  { label: "AVG SAVING / ORDER", value: "$ 1,440", sub: "+$ 320 vs 2023", trend: "up" as const },
  { label: "BEST SINGLE DEAL", value: "12.4%", sub: "MDS-00792 · ribeye prime" },
  { label: "SUPPLIERS USED", value: "18", sub: "concentration: top 3 = 54%" },
  { label: "BUDGET VS ACTUAL", value: "94%", sub: "$ 265k under budget", pill: "ok" as const },
];

type Cat = {
  name: string;
  origins: string;
  orders: number;
  spend: string;
  saved: string;
  pct: string;
  negative?: boolean;
};

const CATEGORIES: Cat[] = [
  { name: "Beef tenderloin", origins: "Brazil · 68% · Uruguay · 22%", orders: 42, spend: "$ 1.62M", saved: "$ 82.1k", pct: "5.1%" },
  { name: "Chicken breast IQF", origins: "Brazil · 100%", orders: 31, spend: "$ 890k", saved: "$ 48.2k", pct: "5.4%" },
  { name: "Ribeye prime", origins: "Brazil · 58% · USA · 42%", orders: 22, spend: "$ 720k", saved: "$ 28.4k", pct: "3.9%" },
  { name: "Lamb shoulder", origins: "Uruguay · 100%", orders: 14, spend: "$ 440k", saved: "$ 17.2k", pct: "3.9%" },
  { name: "Short ribs", origins: "Brazil · 100%", orders: 12, spend: "$ 380k", saved: "$ 6.1k", pct: "1.6%" },
  { name: "Pork belly", origins: "Brazil · 100%", orders: 7, spend: "$ 148k", saved: "-$ 1.8k", pct: "-1.2%", negative: true },
];

type Supplier = {
  initials: string;
  name: string;
  grade: string;
  orders: string;
  flag: string;
  onTime: string;
  onTimeBad?: boolean;
  quality: string;
  reply: string;
  replyTone?: "ok" | "warn" | "bad";
  disputes: string;
  disputesBad?: boolean;
};

const SUPPLIERS: Supplier[] = [
  { initials: "MF", name: "Marfrig", grade: "A+", orders: "61 orders · $ 2.04M", flag: "Brazil 🇧🇷", onTime: "98% on-time", quality: "4.9★ quality", reply: "12m avg reply", replyTone: "ok", disputes: "1 dispute" },
  { initials: "BR", name: "BRF", grade: "A", orders: "31 orders · $ 890k", flag: "Brazil 🇧🇷", onTime: "94% on-time", quality: "4.7★ quality", reply: "28m avg reply", replyTone: "ok", disputes: "0 disputes" },
  { initials: "JB", name: "JBS", grade: "B+", orders: "18 orders · $ 720k", flag: "Brazil 🇧🇷", onTime: "89% on-time", quality: "4.6★ quality", reply: "1h 14m slow", replyTone: "warn", disputes: "0 disputes" },
  { initials: "MN", name: "Minerva", grade: "B", orders: "14 orders · $ 440k", flag: "Uruguay 🇺🇾", onTime: "86% on-time", quality: "4.5★ quality", reply: "3h 42m slow", replyTone: "warn", disputes: "1 dispute" },
  { initials: "SE", name: "Seara", grade: "C", orders: "7 orders · $ 148k", flag: "Brazil 🇧🇷", onTime: "71% on-time", onTimeBad: true, quality: "4.2★ quality", reply: "5h 08m slow", replyTone: "bad", disputes: "2 disputes", disputesBad: true },
];

const WINE = "#8B2252";
const WINE_DARK = "#4A1A2E";
const GREEN = "#16794a";
const RED = "#b42318";
const AMBER = "#b54708";
const BORDER = "1px solid #e5e7eb";
const RADIUS = 14;

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" }) {
  const map = {
    neutral: { bg: "#f3f4f6", color: "#374151" },
    ok: { bg: "#e7f6ee", color: GREEN },
    warn: { bg: "#fdf2d8", color: AMBER },
    bad: { bg: "#fde4e1", color: RED },
  }[tone];
  return (
    <span style={{ background: map.bg, color: map.color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export default function ProcurementIntelligence() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("YTD 2024");

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, letterSpacing: 1.2, color: "#6b7280", fontWeight: 600 }}>
              BUYER · PROCUREMENT INTELLIGENCE
            </span>
            <span style={{ background: "linear-gradient(135deg,#FFE082,#FFB300)", color: "#3a2400", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999, letterSpacing: 0.4 }}>
              ✨ PREMIUM ADD-ON
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 }}>
            {t("buyer.procurement.title", { defaultValue: "Savings & spend dashboard" })}
          </h1>
          <p style={{ color: "#6b7280", margin: "6px 0 0", maxWidth: 720, fontSize: 14 }}>
            {t("buyer.procurement.subtitle", {
              defaultValue: "How much Mundus saved you vs market. Where you're spending. Which suppliers are pulling their weight.",
            })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "inline-flex", background: "#fff", border: BORDER, borderRadius: 999, padding: 3 }}>
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  border: 0,
                  background: period === p ? WINE : "transparent",
                  color: period === p ? "#fff" : "#374151",
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", border: BORDER, background: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}
          >
            <Download size={13} />
            Export CFO report
          </button>
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${WINE_DARK} 0%, #5d2138 100%)`,
          color: "#fff",
          padding: "26px 28px",
          borderRadius: RADIUS,
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 24,
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: 1.3, fontWeight: 700, background: "rgba(255,255,255,0.12)", padding: "4px 10px", borderRadius: 999, marginBottom: 12 }}>
            <Sparkles size={11} /> YTD SAVINGS
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>
            You saved <span style={{ color: "#FFD27A" }}>$ 184,280</span> this year
          </div>
          <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.78)", maxWidth: 560 }}>
            Compared against the median market price for the same cut, origin and timing. That's <b style={{ color: "#fff" }}>4.4%</b> of your $ 4.2M spend — equivalent to <b style={{ color: "#fff" }}>1.3 full-time procurement analysts</b>.
          </p>
        </div>
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 1.3, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>TOTAL SAVED</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>$ 184k</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.78)" }}>
            vs $ 112k in 2023 · <span style={{ color: "#7CE7B5", fontWeight: 700 }}>+64%</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ background: "#fff", border: BORDER, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, letterSpacing: 1.1, color: "#6b7280", fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginTop: 4 }}>{k.value}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11, color: "#6b7280" }}>
              {k.pill === "ok" ? <Pill tone="ok">{k.sub}</Pill> : <span>{k.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly savings */}
      <div style={{ background: "#fff", border: BORDER, borderRadius: RADIUS, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Monthly Savings vs market median · 2024</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>USD thousands, per month</div>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Best month: <b style={{ color: GREEN }}>August · $ 28.4k</b> · Worst: <b style={{ color: AMBER }}>February · $ 6.2k</b>
          </div>
        </div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={MONTHLY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#e5e7eb" />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} stroke="#e5e7eb" tickFormatter={(v) => `$${v}k`} domain={[0, 30]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`$${v}k`, "Saved"]} />
              <Bar dataKey="v" fill={WINE} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two columns: categories + alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 18 }} className="pi-2col">
        {/* Categories */}
        <div style={{ background: "#fff", border: BORDER, borderRadius: RADIUS, padding: 18 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Spend by category · YTD</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>with avg savings %</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#6b7280", fontSize: 10, letterSpacing: 1 }}>
                  <th style={{ padding: "8px 6px", fontWeight: 600 }}>CATEGORY</th>
                  <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>ORDERS</th>
                  <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>SPEND</th>
                  <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>SAVED</th>
                  <th style={{ padding: "8px 6px", fontWeight: 600, textAlign: "right" }}>SAVING %</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c.name} style={{ borderTop: BORDER }}>
                    <td style={{ padding: "10px 6px" }}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{c.origins}</div>
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right", color: "#374151" }}>{c.orders}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 600 }}>{c.spend}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", color: c.negative ? RED : "#111827", fontWeight: 600 }}>{c.saved}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      <Pill tone={c.negative ? "bad" : "ok"}>{c.pct}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef6e7", border: "1px solid #f6e0a8", borderRadius: 10, fontSize: 12, color: "#7a4b00", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Pork belly is the only category where you paid above market. Consider widening your supplier pool — only Seara has sent you pork offers YTD.
            </span>
          </div>
        </div>

        {/* Smart alerts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, color: "#6b7280", fontWeight: 700 }}>SMART ALERTS</div>

          <div style={{ background: "#fff", border: BORDER, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <TrendingDown size={16} color={GREEN} />
              <div style={{ fontWeight: 700, fontSize: 13 }}>Beef tenderloin dropped 4% this week</div>
            </div>
            <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 10px" }}>
              Marfrig, BRF and JBS all adjusted prices down. You reorder on Dec 18 — place it now to lock the lower price.
            </p>
            <button type="button" style={{ background: WINE, color: "#fff", border: 0, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Reorder now
            </button>
          </div>

          <div style={{ background: "#fff", border: BORDER, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Info size={16} color={AMBER} />
              <div style={{ fontWeight: 700, fontSize: 13 }}>Over-concentrated on Marfrig (48%)</div>
            </div>
            <p style={{ fontSize: 12, color: "#4b5563", margin: "0 0 10px" }}>
              Supply chain risk: losing Marfrig disrupts half your orders. Diversify with a second Brazilian supplier.
            </p>
            <button type="button" style={{ background: "#fff", color: WINE, border: `1px solid ${WINE}`, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              See alternatives
            </button>
          </div>

          <div style={{ background: "#fff", border: BORDER, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Wallet size={16} color={GREEN} />
              <div style={{ fontWeight: 700, fontSize: 13 }}>Budget: $ 265k under plan</div>
            </div>
            <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>
              You're pacing to end the year $ 265k under budget. Consider accelerating Q1 2025 purchases to hedge against Brazilian real appreciation.
            </p>
          </div>
        </div>
      </div>

      {/* Supplier scorecard */}
      <div style={{ background: "#fff", border: BORDER, borderRadius: RADIUS, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Your suppliers scorecard · YTD</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>performance vs SLAs</div>
          </div>
          <a href="#" style={{ fontSize: 12, color: WINE, fontWeight: 600, textDecoration: "none" }}>
            See all 18 →
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }} className="pi-supplier-grid">
          {SUPPLIERS.map((s) => (
            <div key={s.name} style={{ border: BORDER, borderRadius: 12, padding: 14, background: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: WINE, color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {s.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{s.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: WINE_DARK, color: "#fff", padding: "1px 7px", borderRadius: 6 }}>{s.grade}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{s.orders} · {s.flag}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <Pill tone={s.onTimeBad ? "bad" : "ok"}>{s.onTime}</Pill>
                <Pill tone="neutral">{s.quality}</Pill>
                <Pill tone={s.replyTone === "bad" ? "bad" : s.replyTone === "warn" ? "warn" : "ok"}>{s.reply}</Pill>
                <Pill tone={s.disputesBad ? "bad" : "neutral"}>{s.disputes}</Pill>
              </div>
            </div>
          ))}

          {/* Suggested */}
          <div style={{ border: `1.5px dashed ${WINE}`, borderRadius: 12, padding: 14, background: "linear-gradient(135deg, #fdf2f6, #fff)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: WINE, letterSpacing: 0.8, marginBottom: 8 }}>
              <Sparkles size={11} /> SUGGESTED
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 }}>Sigma Alimentos</div>
            <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 10, lineHeight: 1.5 }}>
              94% profile match · Mexico 🇲🇽 · HALAL · grass-fed. Most of your peers in UAE now source 20% from Mexico. Would diversify your BR concentration.
            </div>
            <button type="button" style={{ background: WINE, color: "#fff", border: 0, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              View supplier
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .pi-2col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .pi-supplier-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 760px) {
          .pi-supplier-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}