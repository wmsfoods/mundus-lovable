import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useBuyerRequest, type BuyerRequestStatus } from "@/hooks/useBuyerRequests";
import { formatRequestNumber } from "@/lib/requestNumber";
import { formatOfferNumber } from "@/lib/offerNumber";

const STATUS_CHIP: Record<BuyerRequestStatus, string> = {
  new: "req-status-chip is-draft",
  with_responses: "req-status-chip is-active",
  offer_sent: "req-status-chip is-won",
  closed: "req-status-chip is-nowin",
  not_interested: "req-status-chip is-expired",
};
const STATUS_LABEL: Record<BuyerRequestStatus, string> = {
  new: "New",
  with_responses: "With responses",
  offer_sent: "Offer sent",
  closed: "Closed",
  not_interested: "Cancelled",
};

type LinkedOffer = {
  id: string;
  offer_number: number | null;
  supplier_name: string | null;
  status: string | null;
  created_at: string;
};

export default function BuyerRequestDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: r, isLoading, reload } = useBuyerRequest(id);
  const [offers, setOffers] = useState<LinkedOffer[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("offers")
        .select("id, offer_number, supplier_name, status, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: false });
      setOffers((data ?? []) as LinkedOffer[]);
    })();
  }, [id]);

  if (isLoading) {
    return <div className="detail-empty"><p>Loading…</p></div>;
  }
  if (!r) {
    return (
      <>
        <Link to="/buyer/requests" className="nd-back"><ArrowLeftIcon size={16} /> Back</Link>
        <div className="detail-empty"><p>Request not found.</p></div>
      </>
    );
  }

  const onCancel = async () => {
    if (!confirm("Cancel this request? It will no longer be visible to suppliers.")) return;
    const { error } = await supabase
      .from("buyer_requests")
      .update({ status: "not_interested", updated_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Request cancelled");
    reload();
  };

  const reqNo = formatRequestNumber(r.request_number, r.created_at);

  return (
    <>
      <Link to="/buyer/requests" className="nd-back"><ArrowLeftIcon size={16} /> Back</Link>

      <div className="nd-header">
        <div className="nd-h-text">
          <h1>{r.product_name}</h1>
          <div className="nd-sub">
            <span className="mono">{reqNo}</span> ·{" "}
            <span className={STATUS_CHIP[r.status]} style={{ marginLeft: 4 }}>{STATUS_LABEL[r.status]}</span>
          </div>
        </div>
        <div className="nd-h-right">
          {r.status !== "not_interested" && r.status !== "closed" && (
            <button type="button" className="btn-tb" onClick={onCancel}>Cancel Request</button>
          )}
        </div>
      </div>

      <div className="req-detail-grid">
        <div>
          <div className="nd-card">
            <div className="nd-card-head"><strong>Product</strong></div>
            <div className="rd-grid">
              <Field label="Product" value={r.product_name} />
              <Field label="Category" value={r.category ?? "—"} />
              <Field label="Specification" value={r.specification ?? "—"} />
              <Field label="Temperature" value={r.temperature ?? "—"} />
              <Field label="Quantity" value={`${Number(r.quantity_kg).toLocaleString()} kg`} />
              <Field label="Target price" value={r.target_price_usd != null ? `US$ ${Number(r.target_price_usd).toFixed(2)}/kg` : "—"} />
            </div>
          </div>

          <div className="nd-card">
            <div className="nd-card-head"><strong>Logistics</strong></div>
            <div className="rd-grid">
              <Field label="Destination country" value={r.destination_country} />
              <Field label="Destination port" value={r.destination_port ?? "—"} />
              <Field label="Incoterm" value={r.incoterm ?? "—"} />
              <Field label="Container" value={`${r.container_size ?? "—"} × ${r.container_count ?? 1}`} />
              <Field label="Shipment date" value={r.shipment_date ?? "—"} />
            </div>
          </div>

          {r.additional_info && (
            <div className="nd-card">
              <div className="nd-card-head"><strong>Additional notes</strong></div>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--fg-muted)", fontSize: "var(--fs-sm)" }}>
                {r.additional_info}
              </p>
            </div>
          )}

          <div className="nd-card">
            <div className="nd-card-head"><strong>Offers received ({offers.length})</strong></div>
            {offers.length === 0 ? (
              <p style={{ color: "var(--fg-muted)", fontSize: "var(--fs-sm)", margin: 0 }}>No offers received yet.</p>
            ) : (
              <div className="req-offer-list">
                {offers.map((o) => (
                  <div key={o.id} className="req-offer-card">
                    <div className="supplier">
                      <div style={{ minWidth: 0 }}>
                        <div className="name">{o.supplier_name ?? "Supplier"}</div>
                        <div className="sub mono">{formatOfferNumber(o.offer_number, o.created_at)}</div>
                      </div>
                    </div>
                    <div className="actions">
                      <button type="button" className="view" onClick={() => navigate(`/buyer/offers/${o.id}`)}>View offer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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