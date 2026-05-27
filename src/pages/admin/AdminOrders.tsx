import { useEffect, useMemo, useState } from "react";
import { Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatOfferNumber } from "@/lib/offerNumber";
import { ORDER_STATUSES, getStatusConfig, getStatusLabel } from "@/lib/orderStatus";
import { useToast } from "@/hooks/use-toast";

type OrderRow = {
  id: string;
  order_number: number;
  status: string | null;
  revenue_status: string;
  placed_at: string;
  supplier_name: string;
  buyer_name: string;
  offer_number: number | null;
  offer_created_at: string | null;
  total_value: number;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="adm-panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#8B2252" }}>{value}</span>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

const REVENUE_RATE = 0.003; // 0.30%

const REVENUE_STATUSES: { value: string; label: string; bg: string; color: string }[] = [
  { value: "in_progress", label: "In Progress", bg: "#FEF3C7", color: "#92400E" },
  { value: "due",         label: "Due",         bg: "#FEE2E2", color: "#991B1B" },
  { value: "exempt",      label: "Exempt",      bg: "#E5E7EB", color: "#374151" },
];

function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AdminOrders() {
  const { toast } = useToast();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error: e } = await supabase
          .from("orders")
          .select("id, order_number, status, revenue_status, placed_at, buyer:companies!orders_buyer_company_id_fkey(name), offer:offers(offer_number, created_at, supplier_name), items:order_items(settlement_amount, settlement_price)")
          .is("deleted_at", null)
          .order("placed_at", { ascending: false });
        if (e) throw e;
        if (cancelled) return;
        type Raw = {
          id: string; order_number: number; status: string | null; revenue_status: string | null; placed_at: string;
          buyer: { name: string } | { name: string }[] | null;
          offer: { offer_number: number | null; created_at: string | null; supplier_name: string | null } | { offer_number: number | null; created_at: string | null; supplier_name: string | null }[] | null;
          items: { settlement_amount: number | string | null; settlement_price: number | string | null }[] | null;
        };
        const one = <T,>(x: T | T[] | null | undefined): T | null =>
          Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
        const list: OrderRow[] = ((data ?? []) as unknown as Raw[]).map((o) => {
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
            status: o.status,
            revenue_status: o.revenue_status ?? "in_progress",
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

  const stats = useMemo(() => ({
    total: rows.length,
    awaitingAccept: rows.filter(r => r.status === "pending_supplier").length,
    awaitingPayment: rows.filter(r => r.status === "awaiting_payment").length,
    completed: rows.filter(r => r.status === "delivered").length,
    estRevenue: rows.reduce((acc, r) => acc + r.total_value * REVENUE_RATE, 0),
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.supplier_name.toLowerCase().includes(q) ||
        r.buyer_name.toLowerCase().includes(q) ||
        String(r.order_number).includes(q)
      );
    });
  }, [rows, statusFilter, search]);

  const updateStatus = async (id: string, newStatus: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Status updated to ${getStatusLabel(newStatus)}` });
    }
  };

  const updateRevenueStatus = async (id: string, newStatus: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, revenue_status: newStatus } : r)));
    const { error } = await supabase
      .from("orders")
      .update({ revenue_status: newStatus } as never)
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update revenue status", description: error.message, variant: "destructive" });
    }
  };

  const RevenueStatusSelect = ({ id, status }: { id: string; status: string }) => {
    const cfg = REVENUE_STATUSES.find(s => s.value === status) ?? REVENUE_STATUSES[0];
    return (
      <select
        value={status}
        onChange={(e) => updateRevenueStatus(id, e.target.value)}
        style={{
          padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: cfg.bg, color: cfg.color,
          border: `1px solid ${cfg.color}55`, cursor: "pointer",
        }}
      >
        {REVENUE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    );
  };

  const StatusSelect = ({ id, status }: { id: string; status: string | null }) => {
    const cfg = getStatusConfig(status);
    return (
      <select
        value={cfg.value}
        onChange={(e) => updateStatus(id, e.target.value)}
        style={{
          padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: cfg.bg, color: cfg.color,
          border: `1px solid ${cfg.color}55`, cursor: "pointer",
        }}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
        ))}
      </select>
    );
  };

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">All Orders</span>
          <span className="adm-page-subtle"> · Every order across all suppliers</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Awaiting Acceptance" value={stats.awaitingAccept} />
        <StatCard label="Awaiting Payment" value={stats.awaitingPayment} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Est. Revenue (0.30%)" value={fmtMoney(stats.estRevenue)} />
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
          ))}
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
            <Package size={26} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16 }}>No orders found</h3>
        </div>
      ) : (
        <>
          <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Offer</th>
                    <th>Supplier</th>
                    <th>Buyer</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Est. Revenue</th>
                    <th>Revenue Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><strong>#{String(r.order_number).padStart(7, "0")}</strong></td>
                      <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{r.offer_number != null ? formatOfferNumber(r.offer_number, r.offer_created_at) : "—"}</td>
                      <td>{r.supplier_name}</td>
                      <td>{r.buyer_name}</td>
                      <td><StatusSelect id={r.id} status={r.status} /></td>
                      <td className="text-right" style={{ fontSize: 12 }}>{r.total_value > 0 ? fmtMoney(r.total_value) : "—"}</td>
                      <td className="text-right" style={{ fontSize: 12, fontWeight: 600, color: "#8B2252" }}>{r.total_value > 0 ? fmtMoney(r.total_value * REVENUE_RATE) : "—"}</td>
                      <td><RevenueStatusSelect id={r.id} status={r.revenue_status} /></td>
                      <td style={{ color: "#6b7280", fontSize: 12 }}>{fmtDate(r.placed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="adm-only-mobile adm-cards-stack">
            {filtered.map(r => (
              <div key={r.id} className="adm-panel" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                  <strong>#{String(r.order_number).padStart(7, "0")}</strong>
                  <StatusSelect id={r.id} status={r.status} />
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{r.supplier_name} → {r.buyer_name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{fmtDate(r.placed_at)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div>
                    <div style={{ color: "#6b7280" }}>Total · Est. Revenue</div>
                    <div style={{ fontWeight: 600 }}>
                      {r.total_value > 0 ? `${fmtMoney(r.total_value)} · ` : "— · "}
                      <span style={{ color: "#8B2252" }}>{r.total_value > 0 ? fmtMoney(r.total_value * REVENUE_RATE) : "—"}</span>
                    </div>
                  </div>
                  <RevenueStatusSelect id={r.id} status={r.revenue_status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, background: "white",
};