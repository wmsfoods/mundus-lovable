import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, ChevronDownIcon } from "@/components/icons";
import { useOffer, type OfferDetailed, type OfferDetailItem } from "@/hooks/useOffer";
import { formatOfferNumber } from "@/lib/offerNumber";
import { OfferDetailCards, type OfferCardItem } from "@/components/offer/OfferDetailCards";
import { useOfferImages } from "@/hooks/useOfferImages";
import { useOfferItemMediaImages } from "@/lib/offerMediaUrls";
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
import FreightCalculator from "@/components/buyer/FreightCalculator";
import LogisticsOverview from "@/components/buyer/LogisticsOverview";
import { computeFinalPrice } from "@/lib/freightMath";
import { useOfferOriginPorts } from "@/hooks/useOfferOriginPorts";

import { countryToCode } from "@/lib/countryCodes";
import { formatIncotermWithPlace } from "@/lib/incotermPricing";
import { formatShipmentReadyDisplay } from "@/lib/shipmentReady";
import { formatCutMetaFromOfferItem } from "@/lib/cutMetaDisplay";
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
  const originPorts = useOfferOriginPorts(offer.id);
  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];
  const baseImages = useOfferImages(items);
  const mediaImages = useOfferItemMediaImages(items);
  const galleryImages = [...mediaImages, ...baseImages];

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
        originPorts={originPorts}
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

/* ───────── New card-based body (buyer view) ───────── */
function BuyerOfferBody({
  offer,
  title,
  galleryImages,
  isActive,
  totalValuePerFcl,
  totalKg,
  destinations,
  destinationPorts,
  originPorts,
  incotermLabels,
  originCode,
  destCode,
  firstDest,
  condition,
  status,
  statusLabel,
  unit,
  moreOpen,
  setMoreOpen,
  onNegotiate,
  onCloseDeal,
  myNegotiation,
  negIsBiddable,
  negIsDealClosed,
  negStatusLabel,
  navigate,
  t,
}: any) {
  const items: OfferDetailItem[] = offer.items ?? [];
  const firstItem = items[0];
  const category =
    firstItem?.customer_product?.standard_product?.product_category?.name_en ?? null;

  // Lifted selection state so LogisticsOverview, FreightCalculator and the
  // cuts table can all reflect the same port + incoterm pick.
  const [calcSelection, setCalcSelection] = useState<{ portId: string | null; incoterm: string | null }>({
    portId: null,
    incoterm: null,
  });

  // Load freight rows for adjusted per-row pricing (only when items present).
  const { data: freightRows } = useQuery({
    queryKey: ["offerFreightForCuts", offer.id],
    enabled: !!offer.id && items.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("freight_options")
        .select("port_id, cost, insurance, ports(name, code)")
        .eq("offer_id", offer.id);
      return (data ?? []) as Array<{ port_id: string; cost: number | null; insurance: number | null; ports: { name: string; code: string | null } | null }>;
    },
    staleTime: 30_000,
  });

  const selectedFreight = (freightRows ?? []).find((f) => f.port_id === calcSelection.portId) ?? null;
  const selectedPortLabel = selectedFreight?.ports
    ? `${selectedFreight.ports.name}${selectedFreight.ports.code ? ` (${selectedFreight.ports.code})` : ""}`
    : null;

  const cardItems: OfferCardItem[] = items.map((it: OfferDetailItem) => {
    const basePrice = Number(it.price ?? 0);
    const qty = Number(it.amount ?? 0);
    let adjustedPricePerKgUsd: number | null = null;
    let adjustedLabel: string | null = null;
    if (calcSelection.incoterm) {
      if (selectedFreight && qty > 0) {
        const br = computeFinalPrice(
          basePrice,
          qty,
          selectedFreight.cost,
          selectedFreight.insurance,
          offer.primary_pricing_incoterm ?? null,
          calcSelection.incoterm,
          offer.pricing_includes_freight ?? null,
        );
        adjustedPricePerKgUsd = br.final;
        adjustedLabel = `${calcSelection.incoterm}${selectedPortLabel ? ` · ${selectedPortLabel}` : ""}`;
      }
    }
    const meta = formatCutMetaFromOfferItem(it as any);
    const baseSpec = it.meat_specification ? `Spec · ${it.meat_specification}` : null;
    const specLabel = [baseSpec, meta.join(" · ")].filter(Boolean).join(" · ") || null;
    return {
      id: it.id,
      name: it.customer_product?.name ?? "—",
      specLabel,
      packing: it.packaging,
      qtyKg: qty,
      pricePerKgUsd: basePrice,
      adjustedPricePerKgUsd,
      adjustedLabel,
    };
  });
  // attach images by name
  for (const ci of cardItems) {
    const g = galleryImages.find(
      (g: any) => (g.label ?? "").trim().toLowerCase() === ci.name.trim().toLowerCase(),
    );
    if (g) ci.imageSrc = g.src;
  }

  const incotermsFormatted = incotermLabels.map((i: string) =>
    formatIncotermWithPlace(i, {
      originPort: offer.origin_port,
      destinationNames: destinations,
    }),
  );

  const containerLabel = `${offer.total_fcl ?? 1} × ${offer.container_size ?? ""} FCL`.trim();
  const shipmentLabel = formatShipmentReadyDisplay({
    raw: (offer as any).shipment_ready_raw,
    month: offer.shipment_month,
    year: offer.shipment_year,
  });

  const originPortsAll: string[] = (originPorts ?? []).map((p: any) =>
    p.code ? `${p.name} (${p.code})` : p.name,
  );
  const originPortPrimary =
    originPortsAll[0] ?? offer.origin_port ?? null;
  const originExtraCount = Math.max(0, originPortsAll.length - 1);

  const statusPill = (
    <span
      className="status-pill"
      style={{
        background: status.bg,
        color: status.fg,
        marginLeft: 4,
        fontSize: 11,
        padding: "3px 9px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span className="status-dot" style={{ background: status.dot, width: 6, height: 6, borderRadius: "50%" }} />
      {statusLabel}
    </span>
  );

  return (
    <>
      {!isActive && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 16 }}>🚫</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>Offer deactivated</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              This offer has been deactivated by the supplier and is no longer available for negotiation.
            </div>
          </div>
        </div>
      )}

      <OfferDetailCards
        offerNumber={formatOfferNumber(offer.offer_number, offer.created_at)}
        title={title}
        category={category}
        condition={condition}
        totalValueUsd={totalValuePerFcl}
        totalQtyKg={totalKg}
        containerLabel={containerLabel}
        shipmentLabel={shipmentLabel}
        origin={{
          country: offer.origin_country,
          port: originPortPrimary,
          code: originCode,
          extraCount: originExtraCount,
          allPorts: originPortsAll.length ? originPortsAll : (offer.origin_port ? [offer.origin_port] : []),
        }}
        destination={{
          country: firstDest,
          port: null,
          code: destCode,
          extraCount: Math.max(0, destinations.length - 1),
          allCountries: destinations,
        }}
        incoterms={incotermsFormatted}
        paymentTerms={offer.payment_terms}
        containerSize={offer.container_size}
        containerCount={offer.total_fcl ?? 1}
        destinationPortsCount={destinationPorts?.length ?? 0}
        createdAt={offer.created_at}
        supplierName={offer.supplier_name}
        items={cardItems}
        gallery={galleryImages}
        illustrativeLabel={t("buyer.offerDetail.illustrative", "Illustrative")}
        unit={unit}
        statusPill={statusPill}
      />

      {items.length > 0 && incotermLabels.length > 0 && (
        <>
          <LogisticsOverview
            offerId={offer.id}
            selectedPortId={calcSelection.portId}
          />
          <FreightCalculator
            offerId={offer.id}
            primaryPricingIncoterm={offer.primary_pricing_incoterm ?? null}
            pricingIncludesFreight={offer.pricing_includes_freight ?? null}
            acceptedIncoterms={incotermLabels}
            basePricePerKg={
              totalKg > 0 ? totalValuePerFcl / totalKg : Number(firstItem?.price ?? 0)
            }
            totalKg={totalKg}
            onSelectionChange={setCalcSelection}
          />
        </>
      )}

      <div style={{ marginTop: 14 }}>
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
      </div>

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

      <div className="od-actions" style={{ marginTop: 16 }}>
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
          onClick={onCloseDeal}
          disabled={!isActive}
          style={!isActive ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          {t("common.closeDeal")}
        </button>
      </div>
    </>
  );
}
