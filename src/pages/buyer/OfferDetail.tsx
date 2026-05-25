import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@/components/icons";
import { useOffer, type OfferDetailed } from "@/hooks/useOffer";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useOfferImages } from "@/hooks/useOfferImages";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BidModal } from "@/components/buyer/BidModal";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { toast } from "sonner";
import { useOfferDestinationPorts } from "@/components/offer/OfferDestinationPorts";
import { OfferDetailLayout, type OfferItemRow } from "@/components/offer/OfferDetailLayout";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COUNTRY_CODE_MAP: Record<string, string> = {
  argentina: "AR", australia: "AU", brazil: "BR", canada: "CA", chile: "CL",
  china: "CN", egypt: "EG", france: "FR", germany: "DE", "hong kong": "HK",
  india: "IN", italy: "IT", japan: "JP", jordan: "JO", mexico: "MX",
  netherlands: "NL", paraguay: "PY", poland: "PL", "saudi arabia": "SA",
  "south africa": "ZA", "south korea": "KR", spain: "ES", turkey: "TR",
  "united arab emirates": "AE", uae: "AE", "united kingdom": "GB", uk: "GB",
  "united states": "US", "united states of america": "US", usa: "US", us: "US",
  uruguay: "UY", vietnam: "VN",
};
function countryToCode(name: string | null | undefined): string {
  if (!name) return "";
  return COUNTRY_CODE_MAP[name.trim().toLowerCase()] ?? "";
}
function formatShipment(month: number, year: number): string {
  return `${MONTH_NAMES[(month - 1) % 12] ?? ""} ${year}`;
}

export default function BuyerOfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { offer, loading, error, notFound } = useOffer(id);
  const [bidOpen, setBidOpen] = useState(false);
  const { company } = useCurrentCompany();
  const currentCompanyId = company?.id ?? null;

  const { data: myNegotiation } = useQuery({
    queryKey: ["my-negotiation", id, currentCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("id, status")
        .eq("offer_id", id!)
        .eq("buyer_company_id", currentCompanyId)
        .not("status", "in", "(expired,offer_withdrawn)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!currentCompanyId,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      await supabase.from("offer_views").insert({
        offer_id: id,
        viewer_user_id: user.id,
        viewer_company_id: company?.id ?? null,
        source: "marketplace",
      });
    })().catch(() => {});
  }, [id, company?.id]);

  const handleNegotiate = async () => {
    if (offer && (offer.status ?? "active") !== "active") {
      toast.error("This offer has been deactivated by the supplier.");
      return;
    }
    if (id && company?.id) {
      const { data: existingNeg } = await supabase
        .from("negotiations")
        .select("id, status, rejection_cooldown_until")
        .eq("offer_id", id)
        .eq("buyer_company_id", company.id)
        .eq("status", "offer_rejected")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingNeg?.rejection_cooldown_until) {
        const cooldownEnd = new Date(existingNeg.rejection_cooldown_until);
        if (cooldownEnd > new Date()) {
          const hoursLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / 3_600_000);
          toast.error(
            `Your bid was rejected. You can re-negotiate in ${hoursLeft} hour${hoursLeft > 1 ? "s" : ""}.`,
          );
          return;
        }
      }
    }
    setBidOpen(true);
  };

  if (loading) {
    return (
      <>
        <CrumbsHeader title={t("buyer.offerDetail.loadingTitle")} navigate={navigate} />
        <div className="offers-loading">{t("buyer.offerDetail.loading")}</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <CrumbsHeader title={t("buyer.offerDetail.errorTitle")} navigate={navigate} />
        <div className="offers-error">{t("buyer.offerDetail.loadError", { error })}</div>
      </>
    );
  }

  if (notFound || !offer) {
    return (
      <>
        <CrumbsHeader title={t("buyer.offerDetail.notFoundTitle")} navigate={navigate} />
        <div className="empty-state">
          <p>{t("buyer.offerDetail.notFoundBody")}</p>
          <button className="btn-back" onClick={() => navigate("/buyer/offers")}>
            <ArrowLeftIcon size={14} /> {t("buyer.offerDetail.backToOffers")}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <OfferDetailContent
        offer={offer}
        navigate={navigate}
        onNegotiate={handleNegotiate}
        myNegotiation={myNegotiation ?? null}
      />
      <BidModal open={bidOpen} onOpenChange={setBidOpen} offer={offer} />
    </>
  );
}

function CrumbsHeader({ title, navigate }: { title: string; navigate: (path: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="crumbs">
      <a onClick={(e) => { e.preventDefault(); navigate("/buyer"); }} href="/buyer">
        {t("buyer.offerDetail.crumbHome")}
      </a>
      <span className="sep">›</span>
      <a onClick={(e) => { e.preventDefault(); navigate("/buyer/offers"); }} href="/buyer/offers">
        {t("buyer.offerDetail.crumbOffers")}
      </a>
      <span className="sep">›</span>
      <b>{title}</b>
    </div>
  );
}

function OfferDetailContent({
  offer,
  navigate,
  onNegotiate,
  myNegotiation,
}: {
  offer: OfferDetailed;
  navigate: (path: string) => void;
  onNegotiate: () => void;
  myNegotiation: { id: string; status: string } | null;
}) {
  const { t } = useTranslation();
  const destinationPorts = useOfferDestinationPorts(offer.id);
  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];
  const galleryImages = useOfferImages(items);

  const title = mixed
    ? t("buyer.offers.card.mixedTitle", { count: items.length })
    : firstItem?.customer_product?.name ?? "Offer";

  const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);

  const grossValue = items.reduce(
    (s, it) => s + Number(it.price ?? 0) * Number(it.amount ?? 0),
    0
  );
  const fclCount = offer.total_fcl ?? 1;
  const totalValuePerFcl = grossValue / Math.max(1, fclCount);

  const originCode = countryToCode(offer.origin_country);
  const category =
    firstItem?.customer_product?.standard_product?.product_category?.name_en ?? "Beef";

  const destinationNames = (offer.markets ?? [])
    .map((m) => m.market?.country?.english_name)
    .filter((x): x is string => !!x);
  const destinations = destinationNames.map((n) => ({
    name: n,
    code: countryToCode(n),
  }));

  const condition = firstItem?.condition ?? "—";
  const incotermLabels = (offer.incoterms ?? []).map((i) => i.incoterm_type);
  const isActive = (offer.status ?? "active") === "active";

  const negStatus = myNegotiation?.status ?? null;
  const negIsDealClosed = negStatus === "bid_accepted";
  const negIsBiddable = negStatus === "awaiting_supplier" || negStatus === "pending_buyer_review";

  const itemRows: OfferItemRow[] = items.map((it) => ({
    id: it.id,
    name: it.customer_product?.name ?? "—",
    subline: null,
    packaging: it.packaging,
    qtyKg: Number(it.amount ?? 0),
    priceKg: Number(it.price ?? 0),
  }));

  const topActions = (
    <>
      {!myNegotiation && (
        <button
          type="button"
          className="btn-tb"
          onClick={onNegotiate}
          disabled={!isActive}
          style={{
            background: isActive ? "#8B2252" : "#9ca3af",
            color: "#fff",
            borderColor: "transparent",
            cursor: isActive ? "pointer" : "not-allowed",
          }}
        >
          🤝 {t("buyer.offerDetail.negotiate", "Negotiate")}
        </button>
      )}
      {myNegotiation && negIsBiddable && (
        <button
          type="button"
          className="btn-tb"
          onClick={() => navigate(`/buyer/negotiations/${myNegotiation.id}`)}
        >
          💬 View Negotiation
        </button>
      )}
      {myNegotiation && negIsDealClosed && (
        <button
          type="button"
          className="btn-tb"
          onClick={() => navigate(`/buyer/negotiations/${myNegotiation.id}`)}
          style={{ background: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}
        >
          ✅ Deal Closed
        </button>
      )}
      {myNegotiation && !negIsBiddable && !negIsDealClosed && (
        <button
          type="button"
          className="btn-tb"
          onClick={() => navigate(`/buyer/negotiations/${myNegotiation.id}`)}
        >
          💬 View Negotiation
        </button>
      )}
    </>
  );

  const banners = !isActive ? (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        background: "#fee2e2",
        border: "1px solid #fca5a5",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 16 }}>🚫</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>
          Offer deactivated
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          This offer has been deactivated by the supplier and is no longer available for negotiation.
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="btn-back"
        onClick={() => navigate("/buyer/offers")}
        style={{ marginBottom: 12 }}
      >
        <ArrowLeftIcon size={14} /> {t("buyer.offerDetail.backToOffers")}
      </button>
      <div className="crumbs">
        <a onClick={(e) => { e.preventDefault(); navigate("/buyer"); }} href="/buyer">
          {t("buyer.offerDetail.crumbHome")}
        </a>
        <span className="sep">›</span>
        <a onClick={(e) => { e.preventDefault(); navigate("/buyer/offers"); }} href="/buyer/offers">
          {t("buyer.offerDetail.crumbOffers")}
        </a>
        <span className="sep">›</span>
        <b>{title}</b>
      </div>

      <OfferDetailLayout
        offerNumberLabel={formatOfferNumber(offer.offer_number, offer.created_at)}
        title={title}
        category={category}
        cutCount={items.length}
        specCount={items.length}
        packagingLabel={firstItem?.packaging ?? null}
        shipmentLabel={formatShipment(offer.shipment_month, offer.shipment_year)}
        originCountry={offer.origin_country}
        originCountryCode={originCode}
        originPort={offer.origin_port}
        condition={condition}
        destinations={destinations}
        destinationPorts={destinationPorts}
        totalKg={totalKg}
        totalValueUsd={totalValuePerFcl}
        fclCount={fclCount}
        containerSize={offer.container_size}
        items={itemRows}
        showSupplierColumns={false}
        paymentTerms={offer.payment_terms}
        incoterms={incotermLabels}
        createdAt={offer.created_at}
        galleryImages={galleryImages}
        illustrativeLabel={t("buyer.offerDetail.illustrative")}
        topActions={topActions}
        banners={banners}
      />
    </>
  );
}
