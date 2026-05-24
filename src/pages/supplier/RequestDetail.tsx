import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Crumbs } from "@/components/mundus/Crumbs";
import { supabase } from "@/integrations/supabase/client";
import { formatRequestNumber } from "@/lib/requestNumber";
import type { BuyerRequestRow } from "@/hooks/useBuyerRequests";
import { RequestDetailCard } from "@/components/request/RequestDetailCard";
import { countryFlag } from "@/lib/countryFlags";

export default function SupplierRequestDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<BuyerRequestRow | null>(null);
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerCountry, setBuyerCountry] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data: r } = await supabase.from("buyer_requests").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      const row = r as BuyerRequestRow | null;
      setRequest(row);
      if (row?.buyer_company_id) {
        const { data: co } = await supabase
          .from("companies")
          .select("name, country")
          .eq("id", row.buyer_company_id)
          .maybeSingle();
        if (!cancelled) {
          setBuyerName((co as any)?.name ?? "Buyer");
          setBuyerCountry((co as any)?.country ?? "");
        }
      }
      if (row?.buyer_user_id) {
        const { data: cu } = await supabase
          .from("company_users")
          .select("full_name")
          .eq("user_id", row.buyer_user_id)
          .maybeSingle();
        if (!cancelled) setContactName((cu as any)?.full_name ?? "");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="detail-empty"><p>Loading…</p></div>;
  if (!request) {
    return (
      <div className="detail-empty">
        <h1>Request not found</h1>
        <Link to="/supplier/requests" className="btn-tb is-primary">Back to requests</Link>
      </div>
    );
  }

  const r = request;
  const reqNo = formatRequestNumber(r.request_number, r.created_at);
  const postedAt = new Date(r.created_at).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  const handleCreateOffer = () => {
    navigate(`/supplier/offers/new?from=${r.id}`, {
      state: {
        fromRequest: {
          requestId: r.id,
          requestNumber: reqNo,
          client: buyerName,
          product: r.product_name,
          category: r.category ?? "",
          specification: r.specification ?? "",
          quantity: Number(r.quantity_kg),
          targetPrice: r.target_price_usd != null ? Number(r.target_price_usd) : 0,
          destinationCountry: r.destination_country,
          destinationPort: r.destination_port ?? "",
          incoterms: r.incoterm ?? "",
          containerSize: r.container_size ?? "40ft",
          containerCount: r.container_count ?? 1,
          temperature: r.temperature ?? "Frozen",
          shipmentDate: r.shipment_date ?? "",
          additionalInfo: r.additional_info ?? "",
        },
      },
    });
  };

  return (
    <>
      <Crumbs items={[
        { label: "Home", to: "/supplier" },
        { label: "Requests", to: "/supplier/requests" },
        { label: reqNo },
      ]} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
        {/* Buyer header card */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>
              Requested by
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
              {countryFlag(buyerCountry)} {buyerName}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
              {contactName ? <>Contact: {contactName} · </> : null}Posted {postedAt}
            </div>
          </div>
        </div>

        <RequestDetailCard r={r} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Link to="/supplier/requests" className="btn-tb">Not interested</Link>
          <button type="button" className="btn-tb is-primary" onClick={handleCreateOffer}>
            Create offer from this request →
          </button>
        </div>
      </div>
    </>
  );
}