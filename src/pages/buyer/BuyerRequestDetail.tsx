import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useBuyerRequest, type BuyerRequestStatus } from "@/hooks/useBuyerRequests";
import { formatRequestNumber } from "@/lib/requestNumber";
import { formatOfferNumber } from "@/lib/offerNumber";
import { RequestDetailCard } from "@/components/request/RequestDetailCard";

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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, margin: "12px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)" }}>Status</span>
          <span className={STATUS_CHIP[r.status]}>{STATUS_LABEL[r.status]}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {r.status !== "not_interested" && r.status !== "closed" && (
            <button type="button" className="btn-tb" onClick={onCancel}>Cancel request</button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <RequestDetailCard r={r} />

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>📦 Supplier responses</span>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>({offers.length})</span>
          </div>
          {offers.length === 0 ? (
            <p style={{ color: "var(--fg-muted)", fontSize: 13, margin: 0 }}>No offers received yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {offers.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate(`/buyer/offers/${o.id}`)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--g050, #fafaf9)", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{o.supplier_name ?? "Supplier"}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "ui-monospace, monospace" }}>
                      {formatOfferNumber(o.offer_number, o.created_at)}
                    </div>
                  </div>
                  <span style={{ color: "#8B2252", fontWeight: 600, fontSize: 13 }}>View →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}