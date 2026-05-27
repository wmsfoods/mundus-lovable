import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, Eye, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DistributeOfferModal } from "@/components/admin/DistributeOfferModal";
import { formatOfferNumber } from "@/lib/offerNumber";

type OfferRow = {
  id: string;
  offer_number: number | null;
  supplier_id: string;
  supplier_name: string;
  status: string | null;
  origin_country: string | null;
  shipment_month: number;
  shipment_year: number;
  total_fcl: number | null;
  created_at: string;
  item_count: number;
  product_name: string | null;
  destinations: string[];
  view_count: number;
  distribution_count: number;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  draft: "bg-zinc-200 text-zinc-700",
  inactive: "bg-amber-100 text-amber-800",
  archived: "bg-zinc-200 text-zinc-700",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="adm-panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#8B2252" }}>{value}</span>
    </div>
  );
}

export default function AdminOffers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supplierParam = searchParams.get("supplier");
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>(supplierParam ?? "all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [viewsToday, setViewsToday] = useState(0);
  const [totalDistributions, setTotalDistributions] = useState(0);
  const [distribute, setDistribute] = useState<OfferRow | null>(null);

  useEffect(() => {
    if (supplierParam) setSupplierFilter(supplierParam);
  }, [supplierParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: offers, error: offersErr }, { data: views }, { data: dist }, { data: marketsLink }] = await Promise.all([
          supabase
            .from("offers")
            .select("id, offer_number, supplier_id, supplier_name, status, origin_country, shipment_month, shipment_year, total_fcl, created_at, offer_items(id, customer_products(name))")
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          supabase.from("offer_views").select("offer_id, viewed_at"),
          supabase.from("offer_distributions").select("offer_id"),
          supabase.from("offer_markets").select("offer_id, market_id, markets(country:countries(english_name))"),
        ]);
        if (offersErr) throw offersErr;
        if (cancelled) return;

        const viewMap = new Map<string, number>();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let todayCount = 0;
        (views ?? []).forEach((v: { offer_id: string; viewed_at: string }) => {
          viewMap.set(v.offer_id, (viewMap.get(v.offer_id) ?? 0) + 1);
          if (new Date(v.viewed_at) >= today) todayCount++;
        });
        setViewsToday(todayCount);

        const distMap = new Map<string, number>();
        (dist ?? []).forEach((d: { offer_id: string }) => {
          distMap.set(d.offer_id, (distMap.get(d.offer_id) ?? 0) + 1);
        });
        setTotalDistributions((dist ?? []).length);

        const destMap = new Map<string, string[]>();
        (marketsLink ?? []).forEach((m: { offer_id: string; markets: { country: { english_name: string } | null } | null }) => {
          const name = m.markets?.country?.english_name;
          if (!name) return;
          const arr = destMap.get(m.offer_id) ?? [];
          if (!arr.includes(name)) arr.push(name);
          destMap.set(m.offer_id, arr);
        });

        const list: OfferRow[] = (offers ?? []).map((o: {
          id: string; offer_number: number | null; supplier_id: string; supplier_name: string; status: string | null;
          origin_country: string | null; shipment_month: number; shipment_year: number; total_fcl: number | null;
          created_at: string;
          offer_items: { id: string; customer_products: { name: string } | null }[] | null;
        }) => {
          const items = o.offer_items ?? [];
          const first = items[0]?.customer_products?.name ?? null;
          const productName = items.length > 1 ? `Mix · ${items.length} items` : first;
          return {
            id: o.id,
            offer_number: o.offer_number,
            supplier_id: o.supplier_id,
            supplier_name: o.supplier_name,
            status: o.status,
            origin_country: o.origin_country,
            shipment_month: o.shipment_month,
            shipment_year: o.shipment_year,
            total_fcl: o.total_fcl,
            created_at: o.created_at,
            item_count: items.length,
            product_name: productName,
            destinations: destMap.get(o.id) ?? [],
            view_count: viewMap.get(o.id) ?? 0,
            distribution_count: distMap.get(o.id) ?? 0,
          };
        });
        setRows(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    active: rows.filter(r => r.status === "active").length,
    total: rows.length,
    views: viewsToday,
    sent: totalDistributions,
  }), [rows, viewsToday, totalDistributions]);

  const suppliers = useMemo(() => Array.from(new Set(rows.map(r => r.supplier_name))).sort(), [rows]);
  const origins = useMemo(() => Array.from(new Set(rows.map(r => r.origin_country).filter(Boolean) as string[])).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (supplierFilter !== "all" && r.supplier_name !== supplierFilter) return false;
      if (originFilter !== "all" && r.origin_country !== originFilter) return false;
      if (!q) return true;
      return (
        r.supplier_name?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q) ||
        String(r.offer_number ?? "").includes(q)
      );
    });
  }, [rows, search, statusFilter, supplierFilter, originFilter]);

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <span className="adm-page-title">All Offers</span>
          <span className="adm-page-subtle"> · Every offer across all suppliers</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Views Today" value={stats.views} />
        <StatCard label="Sent to Buyers" value={stats.sent} />
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} style={selectStyle}>
          <option value="all">All suppliers</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)} style={selectStyle}>
          <option value="all">All origins</option>
          {origins.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input
          type="text"
          placeholder="Search supplier / product / #"
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
          <h3 style={{ margin: 0, fontSize: 16 }}>No offers found</h3>
        </div>
      ) : (
        <>
          <div className="adm-panel adm-only-desktop" style={{ padding: 0 }}>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Offer #</th>
                    <th>Supplier</th>
                    <th>Product</th>
                    <th>Origin</th>
                    <th>Destinations</th>
                    <th>Status</th>
                    <th className="text-right">Views</th>
                    <th className="text-right">Sent</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => navigate(`/admin/offers/${r.id}`)} style={{ cursor: "pointer" }}>
                      <td><strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{formatOfferNumber(r.offer_number, r.created_at)}</strong></td>
                      <td>{r.supplier_name}</td>
                      <td>{r.product_name ?? "—"}</td>
                      <td>{r.origin_country ?? "—"}</td>
                      <td style={{ fontSize: 12, color: "#6b7280" }}>
                        {r.destinations.length === 0 ? "—" : r.destinations.slice(0, 2).join(", ") + (r.destinations.length > 2 ? ` +${r.destinations.length - 2}` : "")}
                      </td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status ?? ""] ?? "bg-zinc-200 text-zinc-700"}`}>
                          {r.status ?? "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#6b7280" }}>
                          <Eye size={12} /> {r.view_count}
                        </span>
                      </td>
                      <td className="text-right" style={{ color: "#6b7280" }}>{r.distribution_count}</td>
                      <td className="text-right">
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/companies/${r.supplier_id}`); }} style={btnGhost}>Supplier</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setDistribute(r); }} style={btnPrimary}>
                            <Send size={12} style={{ marginRight: 4, display: "inline" }} /> Send
                          </button>
                        </div>
                      </td>
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
                  <strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{formatOfferNumber(r.offer_number, r.created_at)}</strong>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[r.status ?? ""] ?? "bg-zinc-200 text-zinc-700"}`}>
                    {r.status ?? "—"}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{r.product_name ?? "—"}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  {r.supplier_name} · {r.origin_country ?? "—"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#6b7280" }}>
                  <span><Eye size={12} style={{ display: "inline", marginRight: 4 }} />{r.view_count} views · {r.distribution_count} sent</span>
                  <button type="button" onClick={() => setDistribute(r)} style={btnPrimary}>Send</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {distribute && (
        <DistributeOfferModal
          open={!!distribute}
          onClose={() => setDistribute(null)}
          offerId={distribute.id}
          offerNumber={distribute.offer_number}
          offerCreatedAt={distribute.created_at}
          offerTitle={distribute.product_name ?? "Offer"}
          supplierName={distribute.supplier_name}
        />
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, background: "white",
};
const btnGhost: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "white", fontSize: 12, cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 6, border: "1px solid #8B2252", background: "#8B2252", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
};