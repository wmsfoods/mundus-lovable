import "@/styles/mundus-outreach.css";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Inbox, Send, AlarmClock, Sparkles, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutreachIntelligence, type OutreachOpportunity } from "@/hooks/useOutreachIntelligence";

const TYPE_ICON: Record<OutreachOpportunity["type"], JSX.Element> = {
  new_offer_to_buyers: <Send size={16} />,
  new_request_to_suppliers: <Inbox size={16} />,
  stale_negotiation: <AlarmClock size={16} />,
  welcome_sequence: <Sparkles size={16} />,
};

const TYPE_LABEL: Record<OutreachOpportunity["type"], string> = {
  new_offer_to_buyers: "Offer alert",
  new_request_to_suppliers: "Request match",
  stale_negotiation: "Stale nudge",
  welcome_sequence: "Welcome",
};

function priorityDot(p: OutreachOpportunity["priority"]) {
  return p === "high" ? "🔴" : p === "medium" ? "🟡" : "🟢";
}

export default function OutreachCenter() {
  const navigate = useNavigate();
  const { data, isLoading } = useOutreachIntelligence();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | OutreachOpportunity["type"]>("all");

  const stats = data?.stats;
  const opportunities = useMemo(() => {
    const list = data?.opportunities ?? [];
    return filter === "all" ? list : list.filter((o) => o.type === filter);
  }, [data, filter]);

  const kpis = [
    { label: "Opportunities", value: stats?.totalOpportunities ?? 0 },
    { label: "High Priority", value: stats?.highPriority ?? 0 },
    { label: "Matched Recipients", value: stats?.totalMatchedRecipients ?? 0 },
    { label: "Stale Negotiations", value: stats?.staleNegotiations ?? 0 },
    { label: "Active Offers", value: stats?.activeOffers ?? 0 },
    { label: "New Signups (7d)", value: stats?.newSignups ?? 0 },
  ];

  const createCampaign = (op: OutreachOpportunity) => {
    const payload = encodeURIComponent(JSON.stringify({
      opportunityId: op.id,
      type: op.type,
      title: op.title,
      entityId: op.entityId,
      entityType: op.entityType,
      entityLabel: op.entityLabel,
      recipients: op.matchedRecipients,
    }));
    navigate(`/admin/outreach/campaigns?draft=${payload}`);
  };

  return (
    <div className="out-page">
      <div>
        <h1 className="out-h1">Outreach Center</h1>
        <p className="out-sub">Smart matching engine — actionable outreach based on live platform activity</p>
      </div>

      <div className="out-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="out-kpi">
            <div className="out-kpi-label">{k.label}</div>
            <div className="out-kpi-value">{isLoading ? "…" : k.value}</div>
            <div className="out-kpi-delta">{stats?.totalSent ?? 0} sent total</div>
          </div>
        ))}
      </div>

      <div className="out-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 className="out-card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={18} /> Smart Opportunities Feed
          </h3>
          <div className="out-filter-pills" style={{ margin: 0 }}>
            {(["all", "new_offer_to_buyers", "new_request_to_suppliers", "stale_negotiation", "welcome_sequence"] as const).map((f) => (
              <button key={f} className={`out-pill-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : TYPE_LABEL[f as OutreachOpportunity["type"]]}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div style={{ padding: 24, color: "hsl(var(--muted-foreground))" }}>Analyzing platform activity…</div>}

        {!isLoading && opportunities.length === 0 && (
          <div style={{ padding: 24, color: "hsl(var(--muted-foreground))" }}>
            No opportunities right now. Check back as new offers, requests, and signups roll in.
          </div>
        )}

        <div className="out-list">
          {opportunities.map((op) => {
            const isOpen = expanded === op.id;
            const avgScore = op.matchedRecipients.length
              ? Math.round(op.matchedRecipients.reduce((s, r) => s + r.matchScore, 0) / op.matchedRecipients.length)
              : 0;
            return (
              <div key={op.id} className="out-item" style={{ borderLeft: `3px solid ${op.priority === "high" ? "#dc2626" : op.priority === "medium" ? "#d97706" : "#16a34a"}` }}>
                <div className="out-item-head" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="out-item-meta" style={{ marginBottom: 4 }}>
                      <span>{priorityDot(op.priority)} {op.priority.toUpperCase()}</span>
                      <span className="out-badge cat" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {TYPE_ICON[op.type]} {TYPE_LABEL[op.type]}
                      </span>
                      <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{op.entityLabel}</span>
                    </div>
                    <div className="out-item-title">{op.title}</div>
                    <div className="out-item-meta" style={{ marginTop: 4 }}>{op.description}</div>
                  </div>
                  <Button size="sm" className="out-btn-wine" onClick={() => createCampaign(op)} disabled={op.matchedRecipients.length === 0}>
                    Send Campaign →
                  </Button>
                </div>

                <div className="out-item-stats">
                  <div className="out-item-stat">
                    <span className="out-item-stat-label">Recipients</span>
                    <span className="out-item-stat-value">{op.matchedRecipients.length}</span>
                  </div>
                  <div className="out-item-stat">
                    <span className="out-item-stat-label">Avg score</span>
                    <span className="out-item-stat-value">{avgScore}</span>
                  </div>
                  <div className="out-item-stat" style={{ flex: 1 }}>
                    <span className="out-item-stat-label">Top matches</span>
                    <span className="out-item-stat-value" style={{ fontSize: 12, fontWeight: 500 }}>
                      {op.matchedRecipients.slice(0, 3).map((r) => r.companyName).join(", ") || "—"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="out-bar" style={{ flex: 1 }}>
                    <span style={{ width: `${avgScore}%` }} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : op.id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "hsl(var(--muted-foreground))", background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isOpen ? "Hide" : "View"} recipients
                  </button>
                </div>

                {isOpen && (
                  <div className="out-item-expand">
                    {op.matchedRecipients.length === 0 && (
                      <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>No contact email on file for this company.</div>
                    )}
                    {op.matchedRecipients.map((r) => (
                      <div key={r.companyId} className="out-rec-mini">
                        <div className="out-rec-mini-info">
                          <div className="out-rec-mini-name">
                            {r.contactName || r.companyName} <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontWeight: 400 }}>· {r.country || "—"}</span>
                          </div>
                          <div className="out-rec-mini-sub">
                            {r.companyName}{r.contactEmail ? ` · ${r.contactEmail}` : ""}
                          </div>
                          <div className="out-item-meta" style={{ marginTop: 4 }}>
                            {r.matchReasons.map((reason) => (
                              <span key={reason} className="out-badge cat" style={{ fontSize: 10 }}>{reason}</span>
                            ))}
                          </div>
                        </div>
                        <span className="out-pill sent">{r.matchScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}