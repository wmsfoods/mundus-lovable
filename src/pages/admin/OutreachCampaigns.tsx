import "@/styles/mundus-outreach.css";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const FILTERS = ["All", "Initial", "Follow-up 24h", "Follow-up 3d", "Auction"];

type Recipient = { id: string; email: string; name: string; company: string; status: string };
type Campaign = { id: string; name: string; type: string; recipients_count: number; sent_count: number; opened_count: number; clicked_count: number; status: string; sent_at: string; recipients: Recipient[] };

const CAMPAIGNS: Campaign[] = [
  {
    id: "c1", name: "Brazil Beef Q2 — Initial Offer", type: "Initial", recipients_count: 124, sent_count: 124, opened_count: 52, clicked_count: 11, status: "sent", sent_at: "2026-05-20",
    recipients: [
      { id: "r1", email: "yuki@tokyofoods.jp", name: "Yuki Tanaka", company: "Tokyo Foods", status: "opened" },
      { id: "r2", email: "mei@shpremium.cn", name: "Mei Chen", company: "Shanghai Premium", status: "clicked" },
      { id: "r3", email: "carlos@madridcarnicas.es", name: "Carlos Ruiz", company: "Madrid Cárnicas", status: "delivered" },
      { id: "r4", email: "ahmed@gulfmeat.ae", name: "Ahmed Al-Farsi", company: "Gulf Meat Co.", status: "bounced" },
    ],
  },
  {
    id: "c2", name: "Lamb NZ — Follow-up 24h", type: "Follow-up 24h", recipients_count: 87, sent_count: 85, opened_count: 27, clicked_count: 6, status: "partial", sent_at: "2026-05-19",
    recipients: [
      { id: "r5", email: "pierre@parisboucherie.fr", name: "Pierre Dubois", company: "Paris Boucherie", status: "opened" },
      { id: "r6", email: "sara@nordicmeats.se", name: "Sara Lindqvist", company: "Nordic Meats", status: "queued" },
    ],
  },
  {
    id: "c3", name: "Pork EU — Follow-up 3d", type: "Follow-up 3d", recipients_count: 52, sent_count: 52, opened_count: 14, clicked_count: 3, status: "sent", sent_at: "2026-05-18",
    recipients: [
      { id: "r7", email: "luca@romafood.it", name: "Luca Rossi", company: "Roma Food", status: "sent" },
    ],
  },
  {
    id: "c4", name: "Auction MDS-A#00021 — Invite", type: "Auction", recipients_count: 38, sent_count: 38, opened_count: 21, clicked_count: 12, status: "sent", sent_at: "2026-05-17",
    recipients: [
      { id: "r8", email: "yuki@tokyofoods.jp", name: "Yuki Tanaka", company: "Tokyo Foods", status: "clicked" },
    ],
  },
];

export default function OutreachCampaigns() {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = filter === "All" ? CAMPAIGNS : CAMPAIGNS.filter((c) => c.type === filter);
  return (
    <div className="out-page">
      <div>
        <h1 className="out-h1">Campaigns</h1>
        <p className="out-sub">All outreach campaigns sent from Mundus</p>
      </div>
      <div className="out-filter-pills">
        {FILTERS.map((f) => (
          <button key={f} className={`out-pill-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="out-card">
        <table className="out-table">
          <thead><tr><th></th><th>Campaign</th><th>Type</th><th>Recipients</th><th>Opened</th><th>Clicked</th><th>Status</th><th>Sent</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <Fragment key={c.id}>
                <tr onClick={() => setExpanded(expanded === c.id ? null : c.id)} style={{ cursor: "pointer" }}>
                  <td>{expanded === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td>{c.name}</td>
                  <td><span className="out-badge cat">{c.type}</span></td>
                  <td>{c.recipients_count}</td>
                  <td>{c.opened_count} ({Math.round((c.opened_count / c.recipients_count) * 100)}%)</td>
                  <td>{c.clicked_count}</td>
                  <td><span className={`out-pill ${c.status}`}>{c.status}</span></td>
                  <td>{c.sent_at}</td>
                </tr>
                {expanded === c.id && (
                  <tr className="out-expand-row">
                    <td colSpan={8}>
                      <table className="out-rec-table">
                        <thead><tr><th>Email</th><th>Name</th><th>Company</th><th>Status</th></tr></thead>
                        <tbody>
                          {c.recipients.map((r) => (
                            <tr key={r.id}>
                              <td>{r.email}</td><td>{r.name}</td><td>{r.company}</td>
                              <td><span className={`out-pill ${r.status}`}>{r.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}