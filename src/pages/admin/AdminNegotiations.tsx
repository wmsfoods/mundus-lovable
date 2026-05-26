import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Handshake, AlertCircle, Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  useAdminNegotiations,
  type AdminNegotiationRow,
  type NegotiationStatus,
} from "@/hooks/useAdminNegotiations";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice } from "@/lib/units";
import { countryFlag } from "@/lib/countryFlags";
import { Pagination } from "@/components/mundus/Pagination";

type FilterKey = "all" | "awaiting_supplier" | "pending_buyer_review" | "bid_accepted" | "rejected" | "expired";
type ProteinKey = "all" | "beef" | "pork" | "poultry" | "lamb";
type DateRangeKey = "all" | "7d" | "30d" | "90d";
type SortKey = "recent" | "oldest" | "value" | "rounds";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<NegotiationStatus, string> = {
  awaiting_supplier: "bg-red-100 text-red-800 border border-red-200",
  pending_buyer_review: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  bid_accepted: "bg-green-100 text-green-800 border border-green-200",
  offer_rejected: "bg-zinc-200 text-zinc-700 border border-zinc-300",
  offer_exhausted: "bg-zinc-200 text-zinc-700 border border-zinc-300",
  expired: "bg-zinc-700 text-white border border-zinc-700",
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
  const { unit } = useWeightUnit();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [protein, setProtein] = useState<ProteinKey>("all");
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedNeg, setExpandedNeg] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const stats = useMemo(() => {
    const active = rows.filter((r) => !["bid_accepted", "offer_rejected", "offer_exhausted", "expired"].includes(r.status)).length;
    const pending = rows.filter((r) => r.status === "awaiting_supplier").length;
    const closed = rows.filter((r) => r.status === "bid_accepted").length;
    return { active, pending, closed, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      dateRange === "7d" ? now - 7 * 86400_000 :
      dateRange === "30d" ? now - 30 * 86400_000 :
      dateRange === "90d" ? now - 90 * 86400_000 : 0;
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (filter !== "all") {
        if (filter === "rejected") {
          if (r.status !== "offer_rejected" && r.status !== "offer_exhausted") return false;
        } else if (r.status !== filter) return false;
      }
      if (protein !== "all" && r.product_category !== protein) return false;
      if (cutoff && new Date(r.updated_at).getTime() < cutoff) return false;
      if (q) {
        const hay = [
          r.product_name, r.supplier_name, r.buyer_name, r.id,
          formatOfferNumber(r.offer_number, r.offer_created_at),
          ...r.cut_names,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sortBy === "recent") return +new Date(b.updated_at) - +new Date(a.updated_at);
      if (sortBy === "oldest") return +new Date(a.updated_at) - +new Date(b.updated_at);
      if (sortBy === "value") return (b.settled_total_value ?? b.original_value) - (a.settled_total_value ?? a.original_value);
      if (sortBy === "rounds") return b.current_round - a.current_round;
      return 0;
    });
    return out;
  }, [rows, filter, protein, dateRange, search, sortBy]);

  // Group by offer_id
  const grouped = useMemo(() => {
    const map = new Map<string, AdminNegotiationRow[]>();
    filtered.forEach((r) => {
      const arr = map.get(r.offer_id) ?? [];
      arr.push(r);
      map.set(r.offer_id, arr);
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const pageGroups = grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRowClick = (row: AdminNegotiationRow) => {
    setExpandedNeg((m) => ({ ...m, [row.id]: !m[row.id] }));
  };

  const openOfferView = (offerId: string) => navigate(`/admin/offers?id=${offerId}`);

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Handshake size={18} /> Negotiations
          </span>
          <span className="adm-page-subtle"> · Monitor all negotiations across the platform</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active" value={String(stats.active)} accent="#15803d" />
        <StatCard label="Pending Review" value={String(stats.pending)} accent="#b45309" />
        <StatCard label="Closed Deals" value={String(stats.closed)} accent="#1d4ed8" />
        <StatCard label="Total" value={String(stats.total)} accent="#52525b" />
      </div>

      {/* Filters row */}
      <div className="adm-panel" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Search offer, buyer, supplier, ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="adm-input"
            style={{ paddingLeft: 30, width: "100%" }}
          />
        </div>
        <select className="adm-input" value={filter} onChange={(e) => { setFilter(e.target.value as FilterKey); setPage(1); }}>
          <option value="all">All statuses</option>
          <option value="awaiting_supplier">Awaiting Supplier</option>
          <option value="pending_buyer_review">Awaiting Buyer</option>
          <option value="bid_accepted">Bid Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <select className="adm-input" value={protein} onChange={(e) => { setProtein(e.target.value as ProteinKey); setPage(1); }}>
          <option value="all">All proteins</option>
          <option value="beef">Beef</option>
          <option value="pork">Pork</option>
          <option value="poultry">Poultry</option>
          <option value="lamb">Lamb</option>
        </select>
        <select className="adm-input" value={dateRange} onChange={(e) => { setDateRange(e.target.value as DateRangeKey); setPage(1); }}>
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <select className="adm-input" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest</option>
          <option value="value">Highest Value</option>
          <option value="rounds">Most Rounds</option>
        </select>
      </div>

      {/* Content */}
      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "#b91c1c" }}>
          <AlertCircle size={14} style={{ marginRight: 6 }} /> {error}
        </div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>{t("common.loading")}</div>
      ) : grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop */}
          <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}></th>
                    <th>ID</th>
                    <th>Offer</th>
                    <th>Supplier</th>
                    <th>Buyer</th>
                    <th>Product</th>
                    <th>Incoterm</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Value</th>
                    <th>Round</th>
                    <th>Status</th>
                    <th className="text-right">Gap</th>
                    <th>Last Activity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageGroups.map((group) => {
                    const head = group[0];
                    const isCluster = group.length > 1;
                    const clusterCollapsed = collapsedGroups[head.offer_id];
                    return (
                      <>
                        {isCluster && (
                          <tr
                            key={`grp-${head.offer_id}`}
                            onClick={() => setCollapsedGroups((m) => ({ ...m, [head.offer_id]: !m[head.offer_id] }))}
                            style={{ cursor: "pointer", background: "rgba(139,34,82,0.04)" }}
                          >
                            <td>{clusterCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</td>
                            <td colSpan={13} style={{ fontWeight: 600 }}>
                              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, color: "#8B2252" }}>
                                {formatOfferNumber(head.offer_number, head.offer_created_at)}
                              </span>
                              <span style={{ marginLeft: 8 }}>{head.product_name ?? "—"}</span>
                              <span style={{ marginLeft: 8, background: "#8B2252", color: "white", padding: "1px 8px", borderRadius: 999, fontSize: 11 }}>
                                {group.length} bids
                              </span>
                            </td>
                          </tr>
                        )}
                        {!clusterCollapsed && group.map((r, idx) => (
                          <NegotiationRow
                            key={r.id}
                            r={r}
                            unit={unit}
                            locale={locale}
                            t={t}
                            navigate={navigate}
                            expanded={!!expandedNeg[r.id]}
                            onToggle={() => handleRowClick(r)}
                            onOpenOffer={() => openOfferView(r.offer_id)}
                            isChild={isCluster}
                            isLast={idx === group.length - 1}
                          />
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: 12, display: "flex", justifyContent: "flex-end" }}>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>

          {/* Mobile */}
          <div className="adm-only-mobile adm-cards-stack">
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
              <div key={r.id} className="adm-panel" onClick={() => handleRowClick(r)} style={{ padding: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{formatOfferNumber(r.offer_number, r.offer_created_at)}</strong>
                  <StatusBadge status={r.status} t={t} />
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  {r.product_name ?? "—"}
                  {r.total_qty_kg ? ` · ${fmtWeight(r.total_qty_kg, unit)}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {countryFlag(r.supplier_country)} {r.supplier_name} → {countryFlag(r.buyer_country)} {r.buyer_name}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                  <RoundDots current={r.current_round} />
                  <span style={{ color: "#6b7280" }}>{fmtRelative(r.updated_at, locale)}</span>
                </div>
              </div>
            ))}
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

function NegotiationRow({
  r, unit, locale, t, navigate, expanded, onToggle, onOpenOffer, isChild, isLast,
}: {
  r: AdminNegotiationRow;
  unit: "kg" | "lbs";
  locale: string;
  t: (k: string) => string;
  navigate: (path: string) => void;
  expanded: boolean;
  onToggle: () => void;
  onOpenOffer: () => void;
  isChild: boolean;
  isLast: boolean;
}) {
  const gap = r.latest_buyer_bid != null && r.latest_supplier_counter != null
    ? r.latest_supplier_counter - r.latest_buyer_bid
    : null;
  const gapPct = gap != null && r.latest_buyer_bid ? (gap / r.latest_buyer_bid) * 100 : null;
  const totalValue = r.settled_total_value ?? r.original_value;
  const cutSummary = r.cut_names.length > 0
    ? r.cut_names.slice(0, 2).join(", ") + (r.cut_names.length > 2 ? ` +${r.cut_names.length - 2}` : "")
    : (r.product_name ?? "—");

  return (
    <>
      <tr onClick={onToggle} style={{ cursor: "pointer" }}>
        <td>
          {isChild ? (
            <span style={{ display: "inline-block", width: 14, borderLeft: "1px solid #e5e7eb", borderBottom: isLast ? "1px solid #e5e7eb" : "none", height: 18, marginLeft: 6 }} />
          ) : (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </td>
        <td>
          <strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: "#6b7280" }}>
            #{r.id.slice(0, 8)}
          </strong>
        </td>
        <td>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.product_name ?? "—"}</div>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: "#6b7280" }}>
            {formatOfferNumber(r.offer_number, r.offer_created_at)}
          </div>
        </td>
        <td>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>{countryFlag(r.supplier_country)}</span>
            <span>{r.supplier_name ?? "—"}</span>
          </div>
        </td>
        <td>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>{countryFlag(r.buyer_country)}</span>
            <span>{r.buyer_name ?? "—"}</span>
          </div>
        </td>
        <td style={{ fontSize: 12, color: "#374151", maxWidth: 200 }}>
          {r.product_category && (
            <span style={{ display: "inline-block", padding: "1px 6px", marginRight: 6, fontSize: 10, background: "#f3f4f6", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {r.product_category}
            </span>
          )}
          {cutSummary}
        </td>
        <td>
          {r.incoterm ? (
            <span style={{ display: "inline-block", padding: "2px 8px", background: "#f1f5f9", color: "#0f172a", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
              {r.incoterm}
            </span>
          ) : "—"}
        </td>
        <td className="text-right" style={{ fontSize: 12 }}>{r.total_qty_kg ? fmtWeight(r.total_qty_kg, unit) : "—"}</td>
        <td className="text-right" style={{ fontSize: 12, fontWeight: 600 }}>{fmtMoney(totalValue)}</td>
        <td style={{ fontSize: 12 }}>{r.current_round || 0}{r.round_count ? ` of ${r.round_count}` : ""}</td>
        <td><StatusBadge status={r.status} t={t} /></td>
        <td className="text-right" style={{ fontSize: 12 }}>
          {gap != null ? (
            <span style={{ color: gap > 0 ? "#b45309" : "#15803d", fontWeight: 600 }}>
              {gap > 0 ? "+" : ""}{fmtPrice(Math.abs(gap), unit)}
              {gapPct != null ? ` (${gapPct > 0 ? "+" : ""}${gapPct.toFixed(1)}%)` : ""}
            </span>
          ) : "—"}
        </td>
        <td style={{ color: "#6b7280", fontSize: 12 }}>{fmtRelative(r.updated_at, locale)}</td>
        <td style={{ textAlign: "right" }}>
          <button
            type="button"
            className="adm-btn-sm"
            onClick={(e) => { e.stopPropagation(); onOpenOffer(); }}
            title="View offer"
            style={{ background: "transparent", border: "1px solid #e5e7eb", padding: "4px 8px", borderRadius: 6 }}
          >
            <ExternalLink size={12} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={14} style={{ background: "#fafafa", padding: 16 }}>
            <ExpandedDetail r={r} unit={unit} navigate={navigate} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedDetail({
  r, unit, navigate,
}: { r: AdminNegotiationRow; unit: "kg" | "lbs"; navigate: (path: string) => void }) {
  const gap = r.latest_buyer_bid != null && r.latest_supplier_counter != null
    ? r.latest_supplier_counter - r.latest_buyer_bid
    : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Price comparison</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <div><span style={{ color: "#6b7280" }}>Latest buyer bid:</span> <strong>{r.latest_buyer_bid != null ? fmtPrice(r.latest_buyer_bid, unit) : "—"}</strong></div>
          <div><span style={{ color: "#6b7280" }}>Latest counter:</span> <strong>{r.latest_supplier_counter != null ? fmtPrice(r.latest_supplier_counter, unit) : "—"}</strong></div>
          <div><span style={{ color: "#6b7280" }}>Gap:</span> <strong style={{ color: gap != null && gap > 0 ? "#b45309" : "#15803d" }}>{gap != null ? `${gap > 0 ? "+" : ""}${fmtPrice(Math.abs(gap), unit)}` : "—"}</strong></div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Logistics</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <div><span style={{ color: "#6b7280" }}>Container:</span> <strong>{r.container_size ?? "—"}{r.total_fcl ? ` × ${r.total_fcl}` : ""}</strong></div>
          <div><span style={{ color: "#6b7280" }}>Route:</span> <strong>{r.origin_port ?? "—"} → {r.destination_port ?? "—"}</strong></div>
          <div><span style={{ color: "#6b7280" }}>Incoterm:</span> <strong>{r.incoterm ?? "—"}</strong></div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Links</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
          <button type="button" onClick={() => navigate(`/admin/offers?id=${r.offer_id}`)} style={linkBtn}>→ View Offer</button>
          <button type="button" onClick={() => navigate(`/supplier/negotiations/${r.id}`)} style={linkBtn}>→ Open Supplier View</button>
          <button type="button" onClick={() => navigate(`/buyer/negotiations/${r.id}`)} style={linkBtn}>→ Open Buyer View</button>
        </div>
      </div>
      {r.cut_names.length > 0 && (
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Cuts ({r.cut_names.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.cut_names.map((n, i) => (
              <span key={i} style={{ padding: "2px 8px", background: "white", border: "1px solid #e5e7eb", borderRadius: 999, fontSize: 12 }}>{n}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  textAlign: "left",
  padding: 0,
  color: "#8B2252",
  cursor: "pointer",
  fontSize: 13,
};

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="adm-panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: accent ?? "#8B2252" }}>{value}</span>
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