import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  TagIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  MapPinIcon,
  FlagSVG,
} from "@/components/icons";
import { useOffer, type OfferDetailed } from "@/hooks/useOffer";
import { formatOfferNumber } from "@/lib/offerNumber";
import { OfferImageGallery } from "@/components/offer/OfferImageGallery";
import { useOfferImages } from "@/hooks/useOfferImages";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BidModal } from "@/components/buyer/BidModal";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { toast } from "sonner";
import { useOfferDestinationPorts, OfferDestinationPorts } from "@/components/offer/OfferDestinationPorts";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, weightLabel, priceLabel } from "@/lib/units";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

import { countryToCode } from "@/lib/countryCodes";
function formatShipment(month: number, year: number): string {
  return `${MONTH_NAMES[(month - 1) % 12] ?? ""} ${year}`;
}
function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
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
  moreOpen,
  setMoreOpen,
  onNegotiate,
  myNegotiation,
}: {
  offer: OfferDetailed;
  navigate: (path: string) => void;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  onNegotiate: () => void;
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

      <div className="od-grid">
        <OfferImageGallery
          images={galleryImages}
          illustrativeLabel={t("buyer.offerDetail.illustrative")}
        />

        <div className="od-right">
          {!isActive && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
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
          )}
          <div className="od-title-row">
            <span className="oc-chip">
              <TagIcon size={18} />
            </span>
            <div className="od-title-block">
              <h1 className="od-title">{title}</h1>
              <div className="od-subtitle">
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    color: "#9ca3af",
                    marginRight: 8,
                  }}
                >
                  {formatOfferNumber(offer.offer_number, offer.created_at)}
                </span>
                {offer.supplier_name}
                {offer.supplier_rating != null && (
                  <span className="od-rating"> ⭐ {Number(offer.supplier_rating).toFixed(1)}</span>
                )}
              </div>
            </div>
            <span
              className="status-pill"
              style={{ background: status.bg, color: status.fg, marginLeft: "auto" }}
            >
              <span className="status-dot" style={{ background: status.dot }} />
              {statusLabel}
            </span>
          </div>

          <div className="od-price-block">
            <div className="od-price-amount">US$ {formatPrice(totalValuePerFcl)}</div>
            <div className="od-price-caption">
              {t("buyer.offerDetail.perFcl")}
            </div>
          </div>

          <div className="od-cuts">
            <div className="od-cuts-head">
              <span>{t("buyer.offerDetail.cutsHead.cut")}</span>
              <span>{t("buyer.offerDetail.cutsHead.packing")}</span>
              <span className="num">{t("buyer.offerDetail.cutsHead.qty")}</span>
              <span className="num">{t("buyer.offerDetail.cutsHead.price")}</span>
            </div>
            {items.map((it) => (
              <div key={it.id} className="od-cuts-row">
                <span>{it.customer_product?.name ?? "—"}</span>
                <span>{it.packaging === "Vacuum Pack" ? "\n" : (it.packaging ?? "—")}</span>
                <span className="num">{fmtWeight(Number(it.amount), unit)} {weightLabel(unit)}</span>
                <span className="num">US$ {fmtPrice(Number(it.price), unit)}{unit === "kg" ? "/kg" : "/lb"}</span>
              </div>
            ))}
          </div>

          <div className="od-total-weight">
            <span className="amt">{fmtWeight(totalKg, unit)} {weightLabel(unit)}</span>
            <span className="lbl">{t("buyer.offerDetail.totalWeight")}</span>
          </div>

          <div className="od-meta-row">
            <div className="od-meta-item">
              <span className="od-meta-label">{t("buyer.offerDetail.fields.packing")}</span>
              <span className="od-meta-value">{firstItem?.packaging === "Vacuum Pack" ? "\n" : (firstItem?.packaging ?? "—")}</span>
            </div>
            <div className="od-meta-item">
              <span className="od-meta-label">{t("buyer.offerDetail.fields.originPortCountry")}</span>
              <span className="od-meta-value">
                <MapPinIcon size={13} />
                {offer.origin_port} / {offer.origin_country}
                {originCode && <FlagSVG code={originCode} size={13} />}
              </span>
            </div>
            <div className="od-meta-item">
              <span className="od-meta-label">{t("buyer.offerDetail.fields.condition")}</span>
              <span className="od-meta-value">{condition}</span>
            </div>
            {firstDest && (
              <div className="od-meta-item">
                <span className="od-meta-label">
                  {t("buyer.offerDetail.fields.destination")}{destinations.length > 1 ? ` (+${destinations.length - 1})` : ""}
                </span>
                <span className="od-meta-value">
                  {destCode && <FlagSVG code={destCode} size={13} />}
                  {firstDest}
                </span>
                <OfferDestinationPorts ports={destinationPorts} />
              </div>
            )}
          </div>

          <div className="od-terms">
            <div className="od-terms-label">{t("buyer.offerDetail.fields.terms")}</div>
            <div className="od-terms-value">{offer.payment_terms}</div>
          </div>

          <div className="od-fcl-row">
            <span className="od-fcl-count">
              {t((offer.total_fcl ?? 1) === 1 ? "buyer.offerDetail.fcl_one" : "buyer.offerDetail.fcl_other", { count: offer.total_fcl ?? 1 })}
            </span>
            <span className="od-fcl-size">{t("buyer.offerDetail.size", { size: offer.container_size })}</span>
            {incotermLabels.length > 0 && (
              <span className="od-fcl-incoterms">
                {incotermLabels.map((i) => (
                  <span key={i} className="od-incoterm-pill">{i}</span>
                ))}
              </span>
            )}
          </div>

          {offer.exw_pickup_location && incotermLabels.includes("EXW") && (
            <div
              className="od-exw-pickup"
              style={{
                marginTop: 8,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #fde68a",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>📍 EXW Pickup</span>
              <strong>{offer.exw_pickup_location}</strong>
            </div>
          )}

          <div className="od-shipment-row">
            <span className="od-meta-label">{t("buyer.offerDetail.fields.shipment")}</span>
            <span className="od-meta-value">
              {formatShipment(offer.shipment_month, offer.shipment_year)}
            </span>
          </div>

          <button
            className="od-more-toggle"
            onClick={() => setMoreOpen(!moreOpen)}
            type="button"
          >
            <span>{t("buyer.offerDetail.moreInfo")}</span>
            <ChevronDownIcon
              size={14}
              style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
            />
          </button>
          {moreOpen && (
            <div className="od-more-content">
              <BuyerMoreInfoBlock offer={offer} />
            </div>
          )}

          {myNegotiation && (
            <div
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${negIsDealClosed ? "#bae6fd" : "#86efac"}`,
                background: negIsDealClosed ? "#f0f9ff" : "#f0fdf4",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: negIsDealClosed ? "#075985" : "#166534" }}>
                    {negIsDealClosed ? "✅ Deal closed on this offer" : "🤝 You have an active negotiation on this offer"}
                  </span>
                  {!negIsDealClosed && (
                    <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>
                      Status: {negStatusLabel}
                    </span>
                  )}
                </div>
                <a
                  href={`/buyer/negotiations/${myNegotiation.id}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/buyer/negotiations/${myNegotiation.id}`); }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    background: "#8B2252",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Open Negotiation →
                </a>
            </div>
          )}
          {!myNegotiation && offer.status === "negotiating" && (
            <div
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #fde68a",
                background: "#fffbeb",
                fontSize: 13,
                color: "#92400e",
                marginTop: 12,
              }}
            >
              ⚠️ This offer is currently under negotiation with another buyer. You can still place your own bid.
            </div>
          )}
          <div className="od-actions">
            <button
              type="button"
              className="btn-od btn-od-outline"
              onClick={onNegotiate}
              disabled={!isActive || (!!myNegotiation && !negIsBiddable)}
              style={
                !isActive || (!!myNegotiation && !negIsBiddable)
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            >
              {!isActive
                ? "Offer Inactive"
                : myNegotiation
                ? (negIsBiddable ? "Update Bid" : negIsDealClosed ? "Deal closed" : "Negotiation in progress")
                : t("buyer.offerDetail.negotiate")}
            </button>
            <button
              type="button"
              className="btn-od btn-od-primary"
              onClick={() => alert(t("buyer.offerDetail.comingSoonFlow", { action: t("buyer.offerDetail.placeOrder") }))}
            >
              {t("buyer.offerDetail.placeOrder")}
            </button>
          </div>
        </div>
      </div>
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
