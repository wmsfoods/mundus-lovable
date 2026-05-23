import { useEffect, useMemo, useState } from "react";
import { Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OrderRow = {
  id: string;
  order_number: number;
  status: string | null;
  placed_at: string;
  supplier_name: string;
  buyer_name: string;
  offer_number: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending_supplier: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  awaiting_payment: "bg-amber-100 text-amber-800",
  in_production: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-200 text-zinc-700",
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

export default function AdminOrders() {
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
          .select("id, order_number, status, placed_at, buyer:companies!orders_buyer_id_fkey(name), offer:offers(offer_number, supplier_name)")
          .is("deleted_at", null)
          .order("placed_at", { ascending: false });
        if (e) throw e;
        if (cancelled) return;
        type Raw = {
          id: string; order_number: number; status: string | null; placed_at: string;
          buyer: { name: string } | { name: string }[] | null;
          offer: { offer_number: number | null; supplier_name: string | null } | { offer_number: number | null; supplier_name: string | null }[] | null;
        };
        const one = <T,>(x: T | T[] | null | undefined): T | null =>
          Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
        const list: OrderRow[] = ((data ?? []) as unknown as Raw[]).map((o) => {
          const b = one(o.buyer);
          const of = one(o.offer);
          return {
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            placed_at: o.placed_at,
            supplier_name: of?.supplier_name ?? "—",
            buyer_name: b?.name ?? "—",
            offer_number: of?.offer_number ?? null,
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

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">All Orders</span>
          <span className="adm-page-subtle"> · Every order across all suppliers</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Awaiting Acceptance" value={stats.awaitingAccept} />
        <StatCard label="Awaiting Payment" value={stats.awaitingPayment} />
        <StatCard label="Completed" value={stats.completed} />
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          <option value="pending_supplier">Pending Supplier</option>
          <option value="accepted">Accepted</option>
          <option value="awaiting_payment">Awaiting Payment</option>
          <option value="in_production">In Production</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="rejected">Rejected</option>
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
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td><strong>#{String(r.order_number).padStart(7, "0")}</strong></td>
                      <td>{r.offer_number != null ? `#${String(r.offer_number).padStart(6, "0")}` : "—"}</td>
                      <td>{r.supplier_name}</td>
                      <td>{r.buyer_name}</td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status ?? ""] ?? "bg-zinc-200 text-zinc-700"}`}>
                          {(r.status ?? "—").replace(/_/g, " ")}
                        </span>
                      </td>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong>#{String(r.order_number).padStart(7, "0")}</strong>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status ?? ""] ?? "bg-zinc-200 text-zinc-700"}`}>
                    {(r.status ?? "—").replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{r.supplier_name} → {r.buyer_name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(r.placed_at)}</div>
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