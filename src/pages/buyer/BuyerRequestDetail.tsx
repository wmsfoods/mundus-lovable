import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftIcon } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useBuyerRequest, type BuyerRequestStatus } from "@/hooks/useBuyerRequests";
import { formatRequestNumber } from "@/lib/requestNumber";
import { formatOfferNumber } from "@/lib/offerNumber";
import { RequestDetailCard } from "@/components/request/RequestDetailCard";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

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
type LinkedNeg = { id: string; offer_id: string; status: string; settled_total_value: number | null };

export default function BuyerRequestDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: r, isLoading, reload } = useBuyerRequest(id);
  const [offers, setOffers] = useState<LinkedOffer[]>([]);
  const [negotiations, setNegotiations] = useState<LinkedNeg[]>([]);
  const { company } = useCurrentCompany();

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("offers")
        .select("id, offer_number, supplier_name, status, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as LinkedOffer[];
      setOffers(list);
      const ids = list.map((o) => o.id);
      if (ids.length && company?.id) {
        const { data: negs } = await supabase
          .from("negotiations")
          .select("id, offer_id, status, settled_total_value")
          .eq("buyer_company_id", company.id)
          .in("offer_id", ids)
          .is("deleted_at", null);
        setNegotiations((negs ?? []) as LinkedNeg[]);
      } else {
        setNegotiations([]);
      }
    })();
  }, [id, company?.id]);

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
              {offers.map((o) => {
                const neg = negotiations.find((n) => n.offer_id === o.id);
                return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate(neg ? `/buyer/negotiations/${neg.id}` : `/buyer/offers/${o.id}`)}
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
                    {neg && (
                      <div style={{ fontSize: 11, marginTop: 4 }}>
                        {neg.status === "bid_accepted"
                          ? <span style={{ color: "#166534" }}>🎉 Deal closed{neg.settled_total_value != null ? ` — $${Number(neg.settled_total_value).toLocaleString()}` : ""}</span>
                          : neg.status === "awaiting_supplier"
                          ? <span style={{ color: "#f59e0b" }}>⏳ Awaiting supplier response</span>
                          : neg.status === "pending_buyer_review"
                          ? <span style={{ color: "#3b82f6" }}>💬 Counter received — review</span>
                          : <span style={{ color: "#6b7280" }}>📋 {neg.status}</span>}
                      </div>
                    )}
                  </div>
                  <span style={{ color: "#8B2252", fontWeight: 600, fontSize: 13 }}>
                    {neg ? "View negotiation →" : "View offer →"}
                  </span>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}