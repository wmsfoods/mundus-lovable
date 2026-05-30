import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyContext } from "@/hooks/useFamilyContext";
import { useActiveOffice } from "@/hooks/useActiveOffice";

type Row = {
  id: string;
  name: string;
  activeOffers: number;
  openNegs: number;
  closedDeals: number;
  inboundRequests: number;
};

/**
 * Director-only rollup. Renders ONE card per family office with the headline
 * activity counters. Tapping the card focuses that office in the OfficeSwitcher.
 */
export default function ByOfficeRollup() {
  const navigate = useNavigate();
  const fam = useFamilyContext();
  const { setActiveOffice } = useActiveOffice();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fam.loading || fam.offices.length === 0) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const officeIds = fam.offices.map((o) => o.id);
      const [offersRes, negsRes, ordersRes, reqRes] = await Promise.all([
        (supabase as any).from("offers").select("id, supplier_id, status").in("supplier_id", officeIds).is("deleted_at", null),
        (supabase as any).from("negotiations").select("id, offer_id, status").is("deleted_at", null),
        (supabase as any).from("orders").select("id, supplier_id, status").in("supplier_id", officeIds),
        (supabase as any).from("buyer_requests").select("id, assigned_office_id, status").in("assigned_office_id", officeIds).is("deleted_at", null).in("status", ["new","with_responses"]),
      ]);
      const offers = (offersRes.data ?? []) as any[];
      const negs = (negsRes.data ?? []) as any[];
      const orders = (ordersRes.data ?? []) as any[];
      const reqs = (reqRes.data ?? []) as any[];
      const next: Row[] = fam.offices.map((o) => {
        const myOffers = offers.filter((x) => x.supplier_id === o.id);
        const myOfferIds = new Set(myOffers.map((x) => x.id));
        const myNegs = negs.filter((n) => myOfferIds.has(n.offer_id));
        return {
          id: o.id,
          name: o.office_name || o.name,
          activeOffers: myOffers.filter((x) => x.status === "active").length,
          openNegs: myNegs.filter((n) => !["expired","offer_withdrawn","bid_accepted","offer_rejected"].includes(n.status)).length,
          closedDeals: orders.filter((x) => x.supplier_id === o.id).length,
          inboundRequests: reqs.filter((r) => r.assigned_office_id === o.id).length,
        };
      });
      if (!cancelled) {
        setRows(next);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fam.loading, fam.offices]);

  if (fam.loading || fam.offices.length === 0) return null;

  const onFocus = (id: string) => {
    setActiveOffice(id);
    navigate("/supplier");
  };

  return (
    <section style={{ margin: "16px 0" }}>
      <div className="sec-head">
        <h3>By office</h3>
      </div>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        }}
      >
        {loading ? (
          <div className="empty-state" style={{ padding: 16, color: "#6b7280" }}>Loading…</div>
        ) : rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onFocus(r.id)}
            style={{
              textAlign: "left",
              border: "1px solid var(--border)",
              background: "#fff",
              borderRadius: 12,
              padding: 14,
              cursor: "pointer",
              transition: "transform .12s, box-shadow .12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{r.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
              <span style={{ color: "var(--fg-muted)" }}>Active</span><span style={{ fontWeight: 600 }}>{r.activeOffers}</span>
              <span style={{ color: "var(--fg-muted)" }}>Open neg.</span><span style={{ fontWeight: 600 }}>{r.openNegs}</span>
              <span style={{ color: "var(--fg-muted)" }}>Closed</span><span style={{ fontWeight: 600 }}>{r.closedDeals}</span>
              <span style={{ color: "var(--fg-muted)" }}>Inbound</span><span style={{ fontWeight: 600 }}>{r.inboundRequests}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}