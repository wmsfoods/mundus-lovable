import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, ChevronDownIcon } from "@/components/icons";
import { useOffer, type OfferDetailed } from "@/hooks/useOffer";
import { formatOfferNumber } from "@/lib/offerNumber";
import { OfferDetailCards, type OfferCardItem } from "@/components/offer/OfferDetailCards";
import { useOfferImages } from "@/hooks/useOfferImages";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BidModal } from "@/components/buyer/BidModal";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CloseDealDialog } from "@/components/common/CloseDealDialog";
import { closeDealFromOffer } from "@/lib/closeDeal";
import { useOfferDestinationPorts } from "@/components/offer/OfferDestinationPorts";
import { useWeightUnit } from "@/contexts/WeightUnitContext";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

import { countryToCode } from "@/lib/countryCodes";
import { formatIncotermWithPlace } from "@/lib/incotermPricing";
function formatShipment(month: number, year: number): string {
  return `${MONTH_NAMES[(month - 1) % 12] ?? ""} ${year}`;
}
const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string; key: string }> = {
  active:      { bg: "#e6f7ed", fg: "#15803d", dot: "#16a34a", key: "active" },
  new:         { bg: "#fff4e0", fg: "#a85b00", dot: "#f59e0b", key: "new" },
  negotiating: { bg: "#fef0f0", fg: "#b6354b", dot: "#d65370", key: "negotiating" },
  closed:      { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af", key: "closed" },
};
function statusFor(s: string | null) {
  if (!s) return STATUS_COLORS.active;
  return STATUS_COLORS[s.toLowerCase()] ?? STATUS_COLORS.active;
}

export default function BuyerOfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { offer, loading, error, notFound } = useOffer(id);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const { company } = useCurrentCompany();
  const { user } = useAuth();
  const [closeDealOpen, setCloseDealOpen] = useState(false);
  const [closingDeal, setClosingDeal] = useState(false);
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
    supabase.rpc("increment_offer_views" as any, { offer_id: id }).then(() => {}, () => {});
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

  const handleCloseDeal = async () => {
    if (!offer) return;
    if ((offer.status ?? "active") !== "active") {
      toast.error("This offer has been deactivated by the supplier.");
      return;
    }
    if (!company?.id || !user?.id) {
      toast.error("Please sign in to close this deal.");
      return;
    }
    if (closingDeal) return;
    setClosingDeal(true);
    try {
      const { negotiationId } = await closeDealFromOffer(
        offer,
        company.id,
        user.id,
        company.name,
      );
      toast.success(t("common.closeDealDialog.title"));
      setCloseDealOpen(false);
      navigate(`/buyer/negotiations/${negotiationId}`);
    } catch (err: any) {
      const msg = String(err?.message ?? err ?? "");
      console.error("[closeDeal] failed", err);
      toast.error(msg || "Failed to close deal");
    } finally {
      setClosingDeal(false);
    }
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
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
        onNegotiate={handleNegotiate}
        onCloseDeal={() => setCloseDealOpen(true)}
        myNegotiation={myNegotiation ?? null}
      />
      <BidModal open={bidOpen} onOpenChange={setBidOpen} offer={offer} />
      <CloseDealDialog
        open={closeDealOpen}
        onOpenChange={(o) => !closingDeal && setCloseDealOpen(o)}
        onConfirm={handleCloseDeal}
        submitting={closingDeal}
      />
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
  moreOpen,
  setMoreOpen,
  onNegotiate,
  onCloseDeal,
  myNegotiation,
}: {
  offer: OfferDetailed;
  navigate: (path: string) => void;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  onNegotiate: () => void;
  onCloseDeal: () => void;
  myNegotiation: { id: string; status: string } | null;
}) {
  const { t } = useTranslation();
  const { unit } = useWeightUnit();
  const destinationPorts = useOfferDestinationPorts(offer.id);
  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];
  const galleryImages = useOfferImages(items);

  const title = mixed
    ? t("buyer.offers.card.mixedTitle", { count: items.length })
    : firstItem?.customer_product?.name ?? "Offer";

  const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);

  // Value of ONE container (mix qty × price). The buyer creates orders per
  // container; `total_fcl` is how many identical containers are available and
  // must NOT divide the per-FCL value.
  const totalValuePerFcl = items.reduce(
    (s, it) => s + Number(it.price ?? 0) * Number(it.amount ?? 0),
    0
  );

  const originCode = countryToCode(offer.origin_country);

  const destinations = (offer.markets ?? [])
    .map((m) => m.market?.country?.english_name)
    .filter((x): x is string => !!x);
  const firstDest = destinations[0] ?? null;
  const destCode = countryToCode(firstDest);

  const condition = firstItem?.condition ?? "—";

  const incotermLabels = (offer.incoterms ?? []).map((i) => i.incoterm_type);

  const status = statusFor(offer.status);
  const statusLabel = t(`buyer.offers.status.${status.key}`);

  const isActive = (offer.status ?? "active") === "active";

  const negStatus = myNegotiation?.status ?? null;
  const negIsDealClosed = negStatus === "bid_accepted";
  const negIsBiddable = negStatus === "awaiting_supplier" || negStatus === "pending_buyer_review";
  const negStatusLabel = (negStatus ?? "").replace(/_/g, " ");

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

      <BuyerOfferBody
        offer={offer}
        title={title}
        galleryImages={galleryImages}
        isActive={isActive}
        totalValuePerFcl={totalValuePerFcl}
        totalKg={totalKg}
        destinationPorts={destinationPorts}
        destinations={destinations}
        incotermLabels={incotermLabels}
        originCode={originCode}
        destCode={destCode}
        firstDest={firstDest}
        condition={condition}
        status={status}
        statusLabel={statusLabel}
        unit={unit}
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
        onNegotiate={onNegotiate}
        onCloseDeal={onCloseDeal}
        myNegotiation={myNegotiation}
        negIsBiddable={negIsBiddable}
        negIsDealClosed={negIsDealClosed}
        negStatusLabel={negStatusLabel}
        navigate={navigate}
        t={t}
      />
    </>
  );
}

function BuyerMoreInfoBlock({ offer }: { offer: OfferDetailed }) {
  const isHalal = !!offer.is_halal;
  const isKosher = !!offer.is_kosher;
  const paymentTerms = offer.payment_terms;
  const observation = offer.observation;
  const createdAt = offer.created_at;
  const offerNumber = formatOfferNumber(offer.offer_number, offer.created_at);
  const hasAny = !!observation || isHalal || isKosher || !!paymentTerms;
  if (!hasAny) {
    return (
      <div style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>
        No additional information
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10, fontSize: 13, color: "#374151" }}>
      {(isHalal || isKosher) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {isHalal && (
            <span style={{ padding: "2px 8px", borderRadius: 10, background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 600 }}>
              ☪ Halal
            </span>
          )}
          {isKosher && (
            <span style={{ padding: "2px 8px", borderRadius: 10, background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 600 }}>
              ✡ Kosher
            </span>
          )}
        </div>
      )}
      {paymentTerms && (
        <div><strong>Payment terms:</strong> {paymentTerms}</div>
      )}
      {observation && (
        <div><strong>Notes:</strong> {observation}</div>
      )}
      {offerNumber && (
        <div style={{ color: "#6b7280", fontSize: 12 }}>Offer #: {offerNumber}</div>
      )}
      {createdAt && (
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          Created: {new Date(createdAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
