import "@/styles/mundus-outreach.css";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const KPIS = [
  { label: "Total Sent", value: "847", delta: "+12% vs last 14d" },
  { label: "Delivery Rate", value: "94.2%", delta: "+0.8%" },
  { label: "Open Rate", value: "38.6%", delta: "+3.1%" },
  { label: "Click Rate", value: "8.2%", delta: "+1.4%" },
];

const CHART = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  sent: 30 + Math.round(Math.sin(i) * 15 + Math.random() * 40 + 20),
}));

function typeClass(t: string) {
  if (t.startsWith("initial")) return "type-initial";
  if (t.startsWith("followup")) return "type-followup";
  if (t.startsWith("auction")) return "type-auction";
  return "cat";
}

const RECENT = [
  { id: 1, subject: "New offer — Brazil Beef Q2", type: "initial_offer", sent_at: "2026-05-20 10:14", recipients: 124, delivered: 121, opened: 52, clicked: 11, status: "sent" },
  { id: 2, subject: "Auction MDS-A#00021 invite", type: "auction_invite", sent_at: "2026-05-19 16:02", recipients: 38, delivered: 38, opened: 21, clicked: 12, status: "sent" },
  { id: 3, subject: "Following up — Lamb NZ", type: "followup_24h", sent_at: "2026-05-19 09:30", recipients: 87, delivered: 85, opened: 27, clicked: 6, status: "partial" },
  { id: 4, subject: "Still available — Pork EU", type: "followup_3d", sent_at: "2026-05-18 11:45", recipients: 52, delivered: 52, opened: 14, clicked: 3, status: "sent" },
  { id: 5, subject: "Auction MDS-A#00019 — Results", type: "auction_result", sent_at: "2026-05-17 18:20", recipients: 16, delivered: 16, opened: 10, clicked: 4, status: "sent" },
];

const CONTACTS = [
  { name: "Yuki Tanaka", company: "Tokyo Foods", country: "JP", opens: 24, clicks: 9, last: "2h ago" },
  { name: "Mei Chen", company: "Shanghai Premium", country: "CN", opens: 19, clicks: 7, last: "5h ago" },
  { name: "Carlos Ruiz", company: "Madrid Cárnicas", country: "ES", opens: 17, clicks: 6, last: "1d ago" },
  { name: "Ahmed Al-Farsi", company: "Gulf Meat Co.", country: "AE", opens: 14, clicks: 5, last: "1d ago" },
  { name: "Pierre Dubois", company: "Paris Boucherie", country: "FR", opens: 12, clicks: 4, last: "2d ago" },
];

export default function OutreachCenter() {
  return (
    <div className="out-page">
      <div>
        <h1 className="out-h1">Outreach Center</h1>
        <p className="out-sub">Email campaign overview and recent activity</p>
      </div>
      <div className="out-kpis">
        {KPIS.map((k) => (
          <div key={k.label} className="out-kpi">
            <div className="out-kpi-label">{k.label}</div>
            <div className="out-kpi-value">{k.value}</div>
            <div className="out-kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>
      <div className="out-card">
        <h3 className="out-card-title">Emails sent — last 14 days</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sent" fill="#8B2252" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="out-grid-2">
        <div className="out-card">
          <h3 className="out-card-title">Recent campaigns</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="out-table">
              <thead><tr><th>Subject</th><th>Type</th><th>Sent</th><th>Recip</th><th>Deliv</th><th>Open</th><th>Click</th><th>Engagement</th><th>Status</th></tr></thead>
              <tbody>
                {RECENT.map((r) => {
                  const pct = Math.round((r.opened / r.recipients) * 100);
                  return (
                    <tr key={r.id}>
                      <td>{r.subject}</td>
                      <td><span className={`out-badge ${typeClass(r.type)}`}>{r.type}</span></td>
                      <td>{r.sent_at}</td>
                      <td>{r.recipients}</td>
                      <td>{r.delivered}</td>
                      <td>{r.opened}</td>
                      <td>{r.clicked}</td>
                      <td><span className="out-bar"><span style={{ width: `${pct}%` }} /></span> {pct}%</td>
                      <td><span className={`out-pill ${r.status}`}>{r.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="out-card">
          <h3 className="out-card-title">Top contacts by engagement</h3>
          <table className="out-table">
            <thead><tr><th>Contact</th><th>Company</th><th>Country</th><th>Opens</th><th>Clicks</th><th>Last open</th></tr></thead>
            <tbody>
              {CONTACTS.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td><td>{c.company}</td><td>{c.country}</td><td>{c.opens}</td><td>{c.clicks}</td><td>{c.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}