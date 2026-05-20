import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Handshake, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminNegotiations,
  type AdminNegotiationRow,
  type NegotiationStatus,
} from "@/hooks/useAdminNegotiations";

type FilterKey = "all" | "awaiting_supplier" | "pending_buyer_review" | "bid_accepted" | "rejected" | "expired";

const STATUS_STYLES: Record<NegotiationStatus, string> = {
  awaiting_supplier: "bg-amber-100 text-amber-800",
  pending_buyer_review: "bg-amber-100 text-amber-800",
  bid_accepted: "bg-green-100 text-green-800",
  offer_rejected: "bg-red-100 text-red-800",
  offer_exhausted: "bg-zinc-200 text-zinc-700",
  expired: "bg-zinc-200 text-zinc-700",
};

function fmtMoney(v: number | null | undefined) {
  if (v == null || !isFinite(v) || v === 0) return "US$ 0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function fmtRelative(iso: string, locale: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 60) return rtf.format(-Math.floor(diff), "second");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  if (diff < 86400 * 30) return rtf.format(-Math.floor(diff / 86400), "day");
  if (diff < 86400 * 365) return rtf.format(-Math.floor(diff / 86400 / 30), "month");
  return rtf.format(-Math.floor(diff / 86400 / 365), "year");
}

function RoundDots({ current }: { current: number }) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3].map((n) => {
        const filled = n <= current;
        const isCurrent = n === current && current > 0;
        return (
          <span
            key={n}
            className={`inline-block rounded-full ${isCurrent ? "ring-2 ring-[#8B2252]/40" : ""}`}
            style={{
              width: 8,
              height: 8,
              background: filled ? "#8B2252" : "#e5e7eb",
            }}
          />
        );
      })}
    </div>
  );
}

function StatusBadge({ status, t }: { status: NegotiationStatus; t: (k: string) => string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
      {t(`admin.negotiations.status.${status}`)}
    </span>
  );
}

export default function AdminNegotiations() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();
  const { rows, loading, error } = useAdminNegotiations();
  const [filter, setFilter] = useState<FilterKey>("all");

  const stats = useMemo(() => {
    const active = rows.filter((r) => !["bid_accepted", "offer_rejected", "offer_exhausted", "expired"].includes(r.status)).length;
    const totalValue = rows.reduce((s, r) => s + (r.settled_total_value ?? r.original_value ?? 0), 0);
    const withRounds = rows.filter((r) => r.current_round > 0);
    const avgRounds = withRounds.length ? withRounds.reduce((s, r) => s + r.current_round, 0) / withRounds.length : 0;
    const completed = rows.filter((r) => ["bid_accepted", "offer_rejected", "offer_exhausted", "expired"].includes(r.status));
    const won = rows.filter((r) => r.status === "bid_accepted").length;
    const winRate = completed.length ? (won / completed.length) * 100 : 0;
    return { active, totalValue, avgRounds, winRate };
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "rejected") return rows.filter((r) => r.status === "offer_rejected" || r.status === "offer_exhausted");
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("admin.negotiations.filter.all") },
    { key: "awaiting_supplier", label: t("admin.negotiations.filter.awaiting_supplier") },
    { key: "pending_buyer_review", label: t("admin.negotiations.filter.pending_buyer") },
    { key: "bid_accepted", label: t("admin.negotiations.filter.accepted") },
    { key: "rejected", label: t("admin.negotiations.filter.rejected") },
    { key: "expired", label: t("admin.negotiations.filter.expired") },
  ];

  const handleRowClick = (row: AdminNegotiationRow) => {
    toast(t("common.comingSoon", { defaultValue: "Coming soon" }), {
      description: `#${String(row.offer_number ?? "").padStart(6, "0")}`,
    });
  };

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">{t("admin.negotiations.title")}</span>
          <span className="adm-page-subtle"> · {t("admin.negotiations.subtitle")}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label={t("admin.negotiations.stats.active")} value={String(stats.active)} />
        <StatCard label={t("admin.negotiations.stats.total_value")} value={fmtMoney(stats.totalValue)} />
        <StatCard label={t("admin.negotiations.stats.avg_gap")} value="—" />
        <StatCard label={t("admin.negotiations.stats.avg_rounds")} value={stats.avgRounds ? stats.avgRounds.toFixed(1) : "—"} />
        <StatCard label={t("admin.negotiations.stats.win_rate")} value={rows.length ? `${stats.winRate.toFixed(0)}%` : "—"} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mt-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === f.key
                ? "bg-[#8B2252] text-white border-[#8B2252]"
                : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "#b91c1c" }}>
          <AlertCircle size={14} style={{ marginRight: 6 }} /> {error}
        </div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop */}
          <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{t("admin.negotiations.table.id")}</th>
                    <th>{t("admin.negotiations.table.product")}</th>
                    <th>{t("admin.negotiations.table.supplier")}</th>
                    <th>{t("admin.negotiations.table.buyer")}</th>
                    <th>{t("admin.negotiations.table.route")}</th>
                    <th>{t("admin.negotiations.table.status")}</th>
                    <th>{t("admin.negotiations.table.round")}</th>
                    <th className="text-right">{t("admin.negotiations.table.original")}</th>
                    <th className="text-right">{t("admin.negotiations.table.latest_bid")}</th>
                    <th className="text-right">{t("admin.negotiations.table.our_counter")}</th>
                    <th className="text-right">{t("admin.negotiations.table.gap")}</th>
                    <th>{t("admin.negotiations.table.last_activity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const gap = r.latest_buyer_bid != null && r.latest_supplier_counter != null
                      ? r.latest_supplier_counter - r.latest_buyer_bid
                      : null;
                    const gapPct = gap != null && r.latest_buyer_bid
                      ? (gap / r.latest_buyer_bid) * 100
                      : null;
                    return (
                      <tr key={r.id} onClick={() => handleRowClick(r)} style={{ cursor: "pointer" }}>
                        <td><strong>#{String(r.offer_number ?? "").padStart(6, "0")}</strong></td>
                        <td>
                          {r.product_name ? (
                            <span>
                              {r.product_name}
                              {r.product_amount ? ` · ${Math.round(r.product_amount / 1000)}t` : ""}
                              {r.product_condition ? ` · ${r.product_condition}` : ""}
                            </span>
                          ) : "—"}
                        </td>
                        <td>{r.supplier_name ?? "—"}</td>
                        <td>{r.buyer_name ?? "—"}</td>
                        <td>
                          {r.origin_port || r.destination_port
                            ? `${r.origin_port ?? "—"} → ${r.destination_port ?? "—"}`
                            : "—"}
                        </td>
                        <td><StatusBadge status={r.status} t={t} /></td>
                        <td><RoundDots current={r.current_round} /></td>
                        <td className="text-right">{fmtMoney(r.original_value)}</td>
                        <td className="text-right">{r.latest_buyer_bid != null ? `US$ ${r.latest_buyer_bid.toFixed(2)}/kg` : "—"}</td>
                        <td className="text-right">{r.latest_supplier_counter != null ? `US$ ${r.latest_supplier_counter.toFixed(2)}/kg` : "—"}</td>
                        <td className="text-right">
                          {gap != null ? (
                            <span style={{ color: gap > 0 ? "#b45309" : "#15803d" }}>
                              {gap > 0 ? "+" : ""}{gap.toFixed(2)}
                              {gapPct != null ? ` (${gapPct > 0 ? "+" : ""}${gapPct.toFixed(1)}%)` : ""}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ color: "#6b7280", fontSize: 12 }}>{fmtRelative(r.updated_at, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="adm-only-mobile" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((r) => (
              <div key={r.id} className="adm-panel" onClick={() => handleRowClick(r)} style={{ padding: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong>#{String(r.offer_number ?? "").padStart(6, "0")}</strong>
                  <StatusBadge status={r.status} t={t} />
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  {r.product_name ?? "—"}
                  {r.product_amount ? ` · ${Math.round(r.product_amount / 1000)}t` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{r.supplier_name} → {r.buyer_name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                  <RoundDots current={r.current_round} />
                  <span style={{ color: "#6b7280" }}>{fmtRelative(r.updated_at, locale)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="adm-panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#8B2252" }}>{value}</span>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="adm-panel" style={{ padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(139,34,82,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#8B2252" }}>
        <Handshake size={26} />
      </div>
      <h3 style={{ margin: 0, fontSize: 16 }}>{t("admin.negotiations.empty.title")}</h3>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, maxWidth: 420 }}>
        {t("admin.negotiations.empty.description")}
      </p>
    </div>
  );
}