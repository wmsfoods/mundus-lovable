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

const RECENT = [
  { id: 1, name: "Brazil Beef — Initial", type: "Initial", recipients: 124, opens: 0.42, status: "sent" },
  { id: 2, name: "Auction MDS-A#00021 invite", type: "Auction", recipients: 38, opens: 0.55, status: "sent" },
  { id: 3, name: "Lamb NZ — Follow-up", type: "Follow-up 24h", recipients: 87, opens: 0.31, status: "partial" },
  { id: 4, name: "Pork EU — Follow-up", type: "Follow-up 3d", recipients: 52, opens: 0.27, status: "sent" },
  { id: 5, name: "Auction MDS-A#00019 — Results", type: "Auction", recipients: 16, opens: 0.62, status: "sent" },
];

const CONTACTS = [
  { name: "Yuki Tanaka", company: "Tokyo Foods", country: "JP", opens: 24, clicks: 9 },
  { name: "Mei Chen", company: "Shanghai Premium", country: "CN", opens: 19, clicks: 7 },
  { name: "Carlos Ruiz", company: "Madrid Cárnicas", country: "ES", opens: 17, clicks: 6 },
  { name: "Ahmed Al-Farsi", company: "Gulf Meat Co.", country: "AE", opens: 14, clicks: 5 },
  { name: "Pierre Dubois", company: "Paris Boucherie", country: "FR", opens: 12, clicks: 4 },
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
          <table className="out-table">
            <thead><tr><th>Name</th><th>Type</th><th>Recipients</th><th>Opens</th><th>Status</th></tr></thead>
            <tbody>
              {RECENT.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td><span className="out-badge cat">{r.type}</span></td>
                  <td>{r.recipients}</td>
                  <td><span className="out-bar"><span style={{ width: `${Math.round(r.opens * 100)}%` }} /></span> {Math.round(r.opens * 100)}%</td>
                  <td><span className={`out-pill ${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="out-card">
          <h3 className="out-card-title">Top contacts by engagement</h3>
          <table className="out-table">
            <thead><tr><th>Contact</th><th>Company</th><th>Country</th><th>Opens</th><th>Clicks</th></tr></thead>
            <tbody>
              {CONTACTS.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td><td>{c.company}</td><td>{c.country}</td><td>{c.opens}</td><td>{c.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}