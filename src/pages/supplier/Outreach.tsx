import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Send, Eye, Users } from "lucide-react";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { useSupplierOutreach, type OutreachOffer } from "@/hooks/useSupplierOutreach";
import { OutreachModal } from "@/components/supplier/OutreachModal";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending: { bg: "#f1f1f1", fg: "#555", label: "Pending" },
    sent: { bg: "#dbeafe", fg: "#1e40af", label: "Sent" },
    opened: { bg: "#dcfce7", fg: "#166534", label: "Opened" },
    clicked: { bg: "#dcfce7", fg: "#166534", label: "Clicked" },
    replied: { bg: "#fef3c7", fg: "#92400e", label: "Replied" },
    failed: { bg: "#fee2e2", fg: "#991b1b", label: "Failed" },
    bounced: { bg: "#fee2e2", fg: "#991b1b", label: "Bounced" },
  };
  const v = map[status] || map.pending;
  return (
    <span style={{ background: v.bg, color: v.fg, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {v.label}
    </span>
  );
}

export default function Outreach() {
  const { t, i18n } = useTranslation();
  const { offers, recentEmails, stats, loading, refetch } = useSupplierOutreach();
  const [active, setActive] = useState<OutreachOffer | null>(null);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(i18n.language || "en", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <>
      <Crumbs items={[{ label: t("shell.home", { defaultValue: "Home" }), to: "/supplier" }, { label: t("supplier.outreach.title") }]} />
      <PageTitle icon={Mail as any} title={t("supplier.outreach.title")} subtitle={t("supplier.outreach.subtitle")} />

      {/* Section C — Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, margin: "16px 0 24px" }}>
        <StatCard icon={<Send size={18} />} label={t("supplier.outreach.stats.sent7d")} value={stats.sent7d} />
        <StatCard icon={<Eye size={18} />} label={t("supplier.outreach.stats.openRate")} value={`${stats.openRate}%`} />
        <StatCard icon={<Mail size={18} />} label={t("supplier.outreach.stats.pendingOffers")} value={stats.pendingOffers} />
        <StatCard icon={<Users size={18} />} label={t("supplier.outreach.stats.reached")} value={stats.contactsReached} />
      </div>

      {/* Section A — Active offers */}
      <h3 style={{ margin: "0 0 12px" }}>{t("supplier.outreach.activeOffers")}</h3>
      {loading ? (
        <div className="detail-empty"><p>{t("common.loading")}</p></div>
      ) : offers.length === 0 ? (
        <div className="detail-empty"><p>{t("supplier.outreach.noOffers")}</p></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12, marginBottom: 32 }}>
          {offers.map((o) => (
            <div key={o.id} style={{ background: "#fff", border: "1px solid var(--border,#eee)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <strong style={{ fontSize: 15 }}>{o.title}</strong>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>#{o.offerNumber}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                {o.origin} → {o.markets.join(", ") || "—"}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--fg-muted)" }}>
                <span><strong style={{ color: "var(--fg)" }}>{o.incoterm}</strong></span>
                <span>•</span>
                <span>{o.pricePerKg ? `US$ ${o.pricePerKg.toFixed(2)}/kg` : "—"}</span>
                <span>•</span>
                <span>{o.totalFcl} FCL</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, marginTop: 4 }}>
                <span><Users size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} /><strong>{o.matchedContacts}</strong> {t("supplier.outreach.matched")}</span>
                <span><Send size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} /><strong>{o.emailsSent}</strong> {t("supplier.outreach.sent")}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 8, alignSelf: "flex-start" }}
                disabled={o.matchedContacts === 0}
                onClick={() => setActive(o)}
              >
                {t("supplier.outreach.sendOutreach")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Section B — Recent activity */}
      <h3 style={{ margin: "0 0 12px" }}>{t("supplier.outreach.recentActivity")}</h3>
      {recentEmails.length === 0 ? (
        <div className="detail-empty"><p>{t("supplier.outreach.noActivity")}</p></div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("supplier.outreach.col.offer")}</th>
                <th>{t("supplier.outreach.col.contact")}</th>
                <th>{t("supplier.outreach.col.email")}</th>
                <th>{t("supplier.outreach.col.country")}</th>
                <th>{t("supplier.outreach.col.status")}</th>
                <th>{t("supplier.outreach.col.sentAt")}</th>
              </tr>
            </thead>
            <tbody>
              {recentEmails.map((e) => (
                <tr key={e.id}>
                  <td>{e.offerTitle}</td>
                  <td>{e.contactName || "—"}</td>
                  <td style={{ color: "var(--fg-muted)" }}>{e.contactEmail}</td>
                  <td>{e.country || "—"}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td>{fmtDate(e.sentAt || e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OutreachModal
        offer={active}
        open={!!active}
        onClose={() => setActive(null)}
        onSent={refetch}
      />
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border,#eee)", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 12, marginBottom: 6 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}