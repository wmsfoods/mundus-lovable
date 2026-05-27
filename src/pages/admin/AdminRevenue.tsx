import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, AlertCircle, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string;
  order_number: number;
  revenue_status: string;
  revenue_cancel_reason: string | null;
  revenue_cancelled_at: string | null;
  revenue_status_changed_at: string | null;
  revenue_due_date: string | null;
  placed_at: string;
  supplier_name: string;
  buyer_name: string;
  offer_number: number | null;
  offer_created_at: string | null;
  total_value: number;
};

const REVENUE_RATE = 0.003;

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  due:         { label: "Due",         bg: "#FEE2E2", color: "#991B1B" },
  invoiced:    { label: "Invoiced",    bg: "#DBEAFE", color: "#1E40AF" },
  received:    { label: "Received",    bg: "#D1FAE5", color: "#065F46" },
  cancelled:   { label: "Cancelled",   bg: "#F3F4F6", color: "#6B7280" },
  in_progress: { label: "In Progress", bg: "#FEF3C7", color: "#92400E" },
};

// Allowed forward transitions (cancel handled separately)
const ALLOWED: Record<string, string[]> = {
  due:      ["due", "in_progress", "invoiced"],
  invoiced: ["invoiced", "received"],
  received: ["received"],
  cancelled:["cancelled"],
};

const fmtMoney = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="adm-panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#8B2252" }}>{value}</span>
    </div>
  );
}

export default function AdminRevenue() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error: e } = await supabase
          .from("orders")
          .select("id, order_number, revenue_status, revenue_cancel_reason, revenue_cancelled_at, revenue_status_changed_at, revenue_due_date, placed_at, buyer:companies!orders_buyer_company_id_fkey(name), offer:offers(offer_number, created_at, supplier_name), items:order_items(settlement_amount, settlement_price)")
          .is("deleted_at", null)
          .in("revenue_status", ["due", "invoiced", "received", "cancelled"])
          .order("placed_at", { ascending: false });
        if (e) throw e;
        if (cancelled) return;
        type Raw = {
          id: string; order_number: number; revenue_status: string;
          revenue_cancel_reason: string | null; revenue_cancelled_at: string | null; revenue_status_changed_at: string | null;
          revenue_due_date: string | null;
          placed_at: string;
          buyer: { name: string } | { name: string }[] | null;
          offer: { offer_number: number | null; created_at: string | null; supplier_name: string | null } | { offer_number: number | null; created_at: string | null; supplier_name: string | null }[] | null;
          items: { settlement_amount: number | string | null; settlement_price: number | string | null }[] | null;
        };
        const one = <T,>(x: T | T[] | null | undefined): T | null =>
          Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
        const list: Row[] = ((data ?? []) as unknown as Raw[]).map((o) => {
          const b = one(o.buyer);
          const of = one(o.offer);
          const total = (o.items ?? []).reduce((acc, it) => {
            const qty = Number(it.settlement_amount ?? 0);
            const price = Number(it.settlement_price ?? 0);
            return acc + qty * price;
          }, 0);
          return {
            id: o.id,
            order_number: o.order_number,
            revenue_status: o.revenue_status,
            revenue_cancel_reason: o.revenue_cancel_reason,
            revenue_cancelled_at: o.revenue_cancelled_at,
            revenue_status_changed_at: o.revenue_status_changed_at,
            revenue_due_date: o.revenue_due_date,
            placed_at: o.placed_at,
            supplier_name: of?.supplier_name ?? "—",
            buyer_name: b?.name ?? "—",
            offer_number: of?.offer_number ?? null,
            offer_created_at: of?.created_at ?? null,
            total_value: total,
          };
        });
        setRows(list);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const due = rows.filter(r => r.revenue_status === "due");
    const invoiced = rows.filter(r => r.revenue_status === "invoiced");
    const received = rows.filter(r => r.revenue_status === "received");
    const cancelled = rows.filter(r => r.revenue_status === "cancelled");
    return {
      due: due.length,
      invoiced: invoiced.length,
      received: received.length,
      cancelled: cancelled.length,
      pendingRevenue: due.concat(invoiced).reduce((a, r) => a + r.total_value * REVENUE_RATE, 0),
      collectedRevenue: received.reduce((a, r) => a + r.total_value * REVENUE_RATE, 0),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filter !== "all" && r.revenue_status !== filter) return false;
      if (!q) return true;
      return (
        r.supplier_name.toLowerCase().includes(q) ||
        r.buyer_name.toLowerCase().includes(q) ||
        String(r.order_number).includes(q)
      );
    });
  }, [rows, filter, search]);

  const updateStatus = async (row: Row, next: string) => {
    if (next === row.revenue_status) return;
    const allowed = ALLOWED[row.revenue_status] ?? [];
    if (!allowed.includes(next)) {
      toast({ title: "Transition not allowed", variant: "destructive" });
      return;
    }
    const patch: Record<string, unknown> = {
      revenue_status: next,
      revenue_status_changed_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("orders").update(patch as never).eq("id", row.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    if (next === "in_progress") {
      setRows(prev => prev.filter(r => r.id !== row.id));
      toast({ title: "Sent back to Deals" });
    } else {
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, revenue_status: next } : r)));
      toast({ title: `Status set to ${STATUS_CFG[next]?.label ?? next}` });
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      toast({ title: "Reason required", description: "Tell us why this revenue is being cancelled.", variant: "destructive" });
      return;
    }
    setCancelBusy(true);
    const { error } = await supabase.from("orders").update({
      revenue_status: "cancelled",
      revenue_cancel_reason: reason,
      revenue_cancelled_at: new Date().toISOString(),
      revenue_status_changed_at: new Date().toISOString(),
    } as never).eq("id", cancelTarget.id);
    setCancelBusy(false);
    if (error) {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
      return;
    }
    setRows(prev => prev.map(r => (r.id === cancelTarget.id
      ? { ...r, revenue_status: "cancelled", revenue_cancel_reason: reason, revenue_cancelled_at: new Date().toISOString() }
      : r)));
    setCancelTarget(null);
    setCancelReason("");
    toast({ title: "Revenue cancelled" });
  };

  const StatusSelect = ({ row }: { row: Row }) => {
    const cfg = STATUS_CFG[row.revenue_status] ?? STATUS_CFG.due;
    const options = ALLOWED[row.revenue_status] ?? [row.revenue_status];
    const locked = row.revenue_status === "cancelled" || row.revenue_status === "received";
    return (
      <select
        value={row.revenue_status}
        disabled={locked}
        onChange={(e) => updateStatus(row, e.target.value)}
        style={{
          padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: cfg.bg, color: cfg.color,
          border: `1px solid ${cfg.color}55`,
          cursor: locked ? "not-allowed" : "pointer",
          opacity: locked ? 0.85 : 1,
        }}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v === "in_progress" ? "↩ Send back to Deals" : STATUS_CFG[v]?.label ?? v}
          </option>
        ))}
      </select>
    );
  };

  const updateDueDate = async (row: Row, value: string) => {
    const next = value || null;
    const { error } = await supabase.from("orders").update({ revenue_due_date: next } as never).eq("id", row.id);
    if (error) {
      toast({ title: "Failed to set due date", description: error.message, variant: "destructive" });
      return;
    }
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, revenue_due_date: next } : r)));
  };

  const dueBadge = (iso: string | null) => {
    if (!iso) return { color: "#6b7280", bg: "transparent" };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(iso + "T00:00:00");
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { color: "#991B1B", bg: "#FEE2E2" };
    if (diff <= 7) return { color: "#92400E", bg: "#FEF3C7" };
    return { color: "#065F46", bg: "#D1FAE5" };
  };

  return (
    <div className="adm-body">
      <style>{`
        .adm-table.adm-table-tight th,
        .adm-table.adm-table-tight td {
          text-align: left;
          vertical-align: middle;
          padding: 8px 10px;
          white-space: nowrap;
        }
        .adm-table.adm-table-tight th.text-right,
        .adm-table.adm-table-tight td.text-right { text-align: right; }
        .adm-table.adm-table-tight thead th {
          font-size: 10px; letter-spacing: 0.4px; text-transform: uppercase;
          color: #6b7280; font-weight: 600;
        }
        .adm-table.adm-table-tight tbody td { font-size: 12px; color: #111827; }
      `}</style>
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">Revenue</span>
          <span className="adm-page-subtle"> · Track Mundus commission collection (0.30%)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Due" value={stats.due} />
        <StatCard label="Invoiced" value={stats.invoiced} />
        <StatCard label="Received" value={stats.received} />
        <StatCard label="Cancelled" value={stats.cancelled} />
        <StatCard label="Pending Revenue" value={fmtMoney(stats.pendingRevenue)} />
        <StatCard label="Collected" value={fmtMoney(stats.collectedRevenue)} />
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selectStyle}>
          <option value="all">All</option>
          <option value="due">Due</option>
          <option value="invoiced">Invoiced</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          placeholder="Search supplier / buyer / #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...selectStyle, minWidth: 220 }}
        />
      </div>

      {error ? (
        <div className="adm-panel" style={{ padding: 16, color: "#b91c1c" }}>
          <AlertCircle size={14} style={{ marginRight: 6 }} /> {error}
        </div>
      ) : loading ? (
        <div className="adm-panel" style={{ padding: 16 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="adm-panel" style={{ padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(139,34,82,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#8B2252" }}>
            <Coins size={26} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16 }}>No revenue records</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Mark an order as "Due → Revenue" in Deals to start tracking here.</p>
        </div>
      ) : (
        <>
          <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
            <div className="adm-table-wrap">
              <table className="adm-table adm-table-tight">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Offer</th>
                    <th>Supplier</th>
                    <th>Buyer</th>
                    <th>Revenue Status</th>
                    <th>Due Date</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Est. Revenue</th>
                    <th>Reason</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/deals/${r.id}`)}>
                      <td><strong style={{ color: "#8B2252" }}>#{String(r.order_number).padStart(7, "0")}</strong></td>
                      <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                        {r.offer_number != null ? formatOfferNumber(r.offer_number, r.offer_created_at) : "—"}
                      </td>
                      <td>{r.supplier_name}</td>
                      <td>{r.buyer_name}</td>
                      <td onClick={(e) => e.stopPropagation()}><StatusSelect row={r} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const locked = r.revenue_status === "cancelled" || r.revenue_status === "received";
                          const b = dueBadge(r.revenue_due_date);
                          return (
                            <input
                              type="date"
                              value={r.revenue_due_date ?? ""}
                              disabled={locked}
                              onChange={(e) => updateDueDate(r, e.target.value)}
                              style={{
                                padding: "3px 6px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                background: b.bg, color: b.color,
                                border: `1px solid ${b.color}33`,
                                cursor: locked ? "not-allowed" : "pointer",
                                opacity: locked ? 0.7 : 1,
                                fontFamily: "inherit",
                              }}
                            />
                          );
                        })()}
                      </td>
                      <td className="text-right" style={{ fontSize: 12 }}>{r.total_value > 0 ? fmtMoney(r.total_value) : "—"}</td>
                      <td className="text-right" style={{ fontSize: 12, fontWeight: 600, color: "#8B2252" }}>{r.total_value > 0 ? fmtMoney(r.total_value * REVENUE_RATE) : "—"}</td>
                      <td style={{ fontSize: 12, color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.revenue_cancel_reason ?? ""}>{r.revenue_cancel_reason ?? "—"}</td>
                      <td style={{ color: "#6b7280", fontSize: 12 }}>{fmtDate(r.revenue_status_changed_at ?? r.placed_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {r.revenue_status !== "cancelled" ? (
                          <button
                            type="button"
                            onClick={() => { setCancelTarget(r); setCancelReason(""); }}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: "white", color: "#991B1B", border: "1px solid #FCA5A5", cursor: "pointer",
                            }}
                          >
                            <Ban size={12} /> Cancel
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="adm-only-mobile adm-cards-stack">
            {filtered.map(r => (
              <div key={r.id} className="adm-panel" style={{ padding: 12, cursor: "pointer" }} onClick={() => navigate(`/admin/deals/${r.id}`)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                  <strong>#{String(r.order_number).padStart(7, "0")}</strong>
                  <span onClick={(e) => e.stopPropagation()}><StatusSelect row={r} /></span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{r.supplier_name} → {r.buyer_name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Updated {fmtDate(r.revenue_status_changed_at ?? r.placed_at)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: "#6b7280" }}>Total · Est. Revenue</div>
                    <div style={{ fontWeight: 600 }}>
                      {r.total_value > 0 ? `${fmtMoney(r.total_value)} · ` : "— · "}
                      <span style={{ color: "#8B2252" }}>{r.total_value > 0 ? fmtMoney(r.total_value * REVENUE_RATE) : "—"}</span>
                    </div>
                  </div>
                  {r.revenue_status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCancelTarget(r); setCancelReason(""); }}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: "white", color: "#991B1B", border: "1px solid #FCA5A5",
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {r.revenue_cancel_reason && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                    <strong style={{ color: "#374151" }}>Reason:</strong> {r.revenue_cancel_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {cancelTarget && (
        <div
          onClick={() => !cancelBusy && setCancelTarget(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 460, background: "white", borderRadius: 12,
              padding: 20, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Cancel revenue for #{String(cancelTarget.order_number).padStart(7, "0")}
            </h3>
            <p style={{ marginTop: 8, marginBottom: 12, fontSize: 13, color: "#6b7280" }}>
              This record will remain in the list as <strong>Cancelled</strong>. Please describe why.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Buyer disputed invoice, refund issued, internal write-off…"
              rows={4}
              style={{
                width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db",
                fontSize: 13, resize: "vertical", fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelBusy}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", fontSize: 13, cursor: "pointer" }}
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelBusy || cancelReason.trim().length < 3}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: "#991B1B", color: "white", fontSize: 13, fontWeight: 600,
                  cursor: cancelBusy ? "default" : "pointer", opacity: cancelReason.trim().length < 3 ? 0.6 : 1,
                }}
              >
                {cancelBusy ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, background: "white",
};