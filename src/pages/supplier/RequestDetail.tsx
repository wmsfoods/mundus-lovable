import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Crumbs } from "@/components/mundus/Crumbs";
import { supabase } from "@/integrations/supabase/client";
import { formatRequestNumber } from "@/lib/requestNumber";
import type { BuyerRequestRow } from "@/hooks/useBuyerRequests";

export default function SupplierRequestDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<BuyerRequestRow | null>(null);
  const [buyerName, setBuyerName] = useState<string>("");
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
        const { data: co } = await supabase.from("companies").select("name").eq("id", row.buyer_company_id).maybeSingle();
        if (!cancelled) setBuyerName((co as { name?: string } | null)?.name ?? "Buyer");
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

      <div className="rd-header">
        <div>
          <h1 className="rd-title">Buyer Request</h1>
          <p className="rd-subtitle">{reqNo} · from {buyerName}</p>
        </div>
      </div>

      <section className="rd-section">
        <h2 className="rd-section-title">Product</h2>
        <div className="rd-card">
          <h3 className="rd-card-title">{r.product_name}</h3>
          <div className="rd-grid">
            <Field label="Category" value={r.category ?? "—"} />
            <Field label="Specification" value={r.specification ?? "—"} />
            <Field label="Temperature" value={r.temperature ?? "—"} />
            <Field label="Quantity" value={`${Number(r.quantity_kg).toLocaleString()} kg`} />
            <Field label="Target price" value={r.target_price_usd != null ? `US$ ${Number(r.target_price_usd).toFixed(2)}/kg` : "—"} />
          </div>
        </div>
      </section>

      <section className="rd-section">
        <h2 className="rd-section-title">Logistics</h2>
        <div className="rd-grid rd-grid-3">
          <Field label="Destination country" value={r.destination_country} />
          <Field label="Destination port" value={r.destination_port ?? "—"} />
          <Field label="Incoterm" value={r.incoterm ?? "—"} />
          <Field label="Container size" value={r.container_size ?? "—"} />
          <Field label="# Containers" value={String(r.container_count ?? 1)} />
          <Field label="Shipment date" value={r.shipment_date ?? "—"} />
        </div>
      </section>

      {r.additional_info && (
        <section className="rd-section">
          <h2 className="rd-section-title">Additional info</h2>
          <div className="rd-additional" style={{ whiteSpace: "pre-wrap" }}>{r.additional_info}</div>
        </section>
      )}

      <div className="rd-cta-row">
        <Link to="/supplier/requests" className="btn-tb">Back</Link>
        <button type="button" className="btn-tb is-primary" onClick={handleCreateOffer}>
          Create Offer from this Request
        </button>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="rd-field-label">{label}</div>
      <div className="rd-field-value">{value}</div>
    </div>
  );
}