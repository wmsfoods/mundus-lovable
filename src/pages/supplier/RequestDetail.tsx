import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Crumbs } from "@/components/mundus/Crumbs";
import { supabase } from "@/integrations/supabase/client";
import { formatRequestNumber } from "@/lib/requestNumber";
import type { BuyerRequestRow } from "@/hooks/useBuyerRequests";
import { RequestDetailCard } from "@/components/request/RequestDetailCard";
import { countryFlag } from "@/lib/countryFlags";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { formatOfferNumber } from "@/lib/offerNumber";

type ResponseOffer = { id: string; offer_number: number | null; status: string | null; created_at: string };
type ResponseNeg = { id: string; offer_id: string; status: string };

export default function SupplierRequestDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useCurrentCompany();
  const [request, setRequest] = useState<BuyerRequestRow | null>(null);
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerCountry, setBuyerCountry] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [myOffers, setMyOffers] = useState<ResponseOffer[]>([]);
  const [myNegs, setMyNegs] = useState<ResponseNeg[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data: r } = await supabase.from("buyer_requests").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      const row = r as unknown as BuyerRequestRow | null;
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

  useEffect(() => {
    if (!id || !company?.id) return;
    let cancelled = false;
    (async () => {
      const { data: offers } = await supabase
        .from("offers")
        .select("id, offer_number, status, created_at")
        .eq("supplier_id", company.id)
        .eq("request_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (offers ?? []) as ResponseOffer[];
      setMyOffers(list);
      const ids = list.map((o) => o.id);
      if (ids.length) {
        const { data: negs } = await supabase
          .from("negotiations")
          .select("id, offer_id, status")
          .in("offer_id", ids)
          .is("deleted_at", null);
        if (!cancelled) setMyNegs((negs ?? []) as ResponseNeg[]);
      } else {
        setMyNegs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [id, company?.id]);

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
  const isWithdrawn = r.status === "not_interested";
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
        {r.target_supplier_id && (
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: "#eff6ff", border: "1px solid #bfdbfe",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🎯</span>
            <div style={{ fontSize: 13 }}>
              <strong>Direct request</strong> — This buyer sent this request specifically to you.
            </div>
          </div>
        )}
        {isWithdrawn && (
          <div style={{
            padding: "12px 16px", borderRadius: 8,
            background: "#fee2e2", border: "1px solid #fca5a5",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>
                Buyer withdrew this request
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                The buyer cancelled this request. You can no longer create offers from it.
              </div>
            </div>
          </div>
        )}

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

        {myOffers.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              ✅ Your Response{myOffers.length > 1 ? "s" : ""} ({myOffers.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {myOffers.map((offer) => {
                const negs = myNegs.filter((n) => n.offer_id === offer.id);
                const accepted = negs.find((n) => n.status === "bid_accepted");
                return (
                  <div key={offer.id} style={{
                    padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--g050, #fafaf9)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, flexWrap: "wrap",
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        Offer {formatOfferNumber(offer.offer_number, offer.created_at)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                        Created {new Date(offer.created_at).toLocaleDateString()}
                        {negs.length > 0 && ` · ${negs.length} negotiation(s)`}
                        {accepted && " · 🎉 Deal closed!"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="btn-tb" onClick={() => navigate(`/supplier/offers/${offer.id}`)}>
                        View offer →
                      </button>
                      {accepted && (
                        <button type="button" className="btn-tb is-primary"
                          onClick={() => navigate(`/supplier/negotiations/${accepted.id}`)}>
                          View deal →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <Link to="/supplier/requests" className="btn-tb">Not interested</Link>
          {!isWithdrawn && (
            <button type="button" className="btn-tb is-primary" onClick={handleCreateOffer}>
              {myOffers.length > 0 ? "Create another offer →" : "Create offer from this request →"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}