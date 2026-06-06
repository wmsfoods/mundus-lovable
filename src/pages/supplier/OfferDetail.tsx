import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CopyIcon,
  ShareIcon,
  ChevronDownIcon,
} from "@/components/icons";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { supabase } from "@/integrations/supabase/client";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useOfferImages } from "@/hooks/useOfferImages";
import { useOfferItemMediaImages } from "@/lib/offerMediaUrls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { publicUrl } from "@/lib/publicUrl";
import { notifyCompanyUsers } from "@/lib/notifications";
import { auditLog } from "@/lib/auditLog";
import { useOfferDestinationPorts } from "@/components/offer/OfferDestinationPorts";
import { OfferDetailCards } from "@/components/offer/OfferDetailCards";
import { countryFlag } from "@/lib/countryFlags";
import { countryToCode } from "@/lib/countryCodes";
import { formatIncotermWithPlace } from "@/lib/incotermPricing";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { type WeightUnit } from "@/lib/units";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function SupplierOfferDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [active, setActive] = useState<boolean | null>(null);
  const { unit } = useWeightUnit();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activeNegCount, setActiveNegCount] = useState<number>(0);
  const [deactivating, setDeactivating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [negotiations, setNegotiations] = useState<Array<{
    id: string;
    status: string;
    buyer_company_id: string;
    incoterm: string | null;
    created_at: string;
    updated_at: string;
    buyer?: { id: string; name: string | null; country: string | null } | null;
  }>>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("negotiations")
        .select(`id, status, buyer_company_id, incoterm, created_at, updated_at,
          buyer:companies!negotiations_buyer_company_id_fkey ( id, name, country )`)
        .eq("offer_id", id)
        .not("status", "in", "(expired,offer_withdrawn)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!cancelled) setNegotiations((data as any) ?? []);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const { offers: realOffers, loading: offersLoading } = useRealSupplierOffers();
  const offer: SupplierOffer | undefined = useMemo(
    () => realOffers.find((o) => o.id === id),
    [id, realOffers]
  );

  const baseImages = useOfferImages(offer?.items ?? []);
  const mediaImages = useOfferItemMediaImages(offer?.items ?? []);
  const galleryImages = useMemo(() => [...mediaImages, ...baseImages], [mediaImages, baseImages]);
  const destinationPorts = useOfferDestinationPorts(id);

  if (offersLoading && !offer) {
    return <div className="empty-state"><p>{t("supplier.offers.loading", "Loading…")}</p></div>;
  }

  if (!offer) {
    return (
      <>
        <div className="crumbs">
          <a onClick={(e) => { e.preventDefault(); navigate("/supplier"); }} href="/supplier">
            {t("supplier.offers.crumbHome")}
          </a>
          <span className="sep">›</span>
          <a onClick={(e) => { e.preventDefault(); navigate("/supplier/offers"); }} href="/supplier/offers">
            {t("supplier.offers.title")}
          </a>
          <span className="sep">›</span>
          <b>{t("supplier.offers.detail.notFoundTitle")}</b>
        </div>
        <div className="empty-state">
          <p>{t("supplier.offers.detail.notFoundBody")}</p>
          <button className="btn-back" onClick={() => navigate("/supplier/offers")}>
            <ArrowLeftIcon size={14} /> {t("supplier.offers.detail.backToOffers")}
          </button>
        </div>
      </>
    );
  }

  const isActive = active ?? offer.active;
  const offerTitle = offer.title;

  const ACTIVE_STATUSES_EXCLUSION = '("offer_rejected","expired","bid_accepted","offer_withdrawn")';

  async function openToggle() {
    // Activating again is unrestricted — but must persist to DB
    if (!isActive) {
      if (activating) return;
      setActivating(true);
      try {
        const { error } = await supabase
          .from("offers")
          .update({ status: "active" })
          .eq("id", id);
        if (error) {
          toast.error(error.message || "Failed to reactivate");
          return;
        }
        setActive(true);
        auditLog({
          action: "offer.reactivated",
          category: "offer",
          entityType: "offer",
          entityId: id,
          entityLabel: formatOfferNumber(offer.offerNumber, offer.createdAt),
          details: { offerTitle },
        });
        toast.success("Offer reactivated.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reactivate");
      } finally {
        setActivating(false);
      }
      return;
    }
    // Check for active negotiations before deactivating
    const { data: negs } = await supabase
      .from("negotiations")
      .select("id")
      .eq("offer_id", id)
      .not("status", "in", ACTIVE_STATUSES_EXCLUSION)
      .is("deleted_at", null);
    setActiveNegCount(negs?.length ?? 0);
    setDeactivateOpen(true);
  }

  async function confirmDeactivate() {
    if (deactivating) return;
    setDeactivating(true);
    try {
      // 1. Mark offer inactive (best-effort against real DB; mock data also flips UI)
      await supabase.from("offers").update({ status: "inactive" }).eq("id", id);

      // 2. Fetch active negotiations
      const { data: negs } = await supabase
        .from("negotiations")
        .select("id, buyer_company_id")
        .eq("offer_id", id)
        .not("status", "in", ACTIVE_STATUSES_EXCLUSION)
        .is("deleted_at", null);

      if (negs && negs.length > 0) {
        const negIds = negs.map((n) => n.id);
        await supabase
          .from("negotiations")
          .update({ status: "offer_withdrawn", updated_at: new Date().toISOString() })
          .in("id", negIds);

        for (const _neg of negs) {
          supabase.functions
            .invoke("negotiation-notifications", {
              body: {
                action: "offer_withdrawn",
                data: {
                  buyer_email: "buyer@example.com",
                  offer_title: offerTitle,
                  marketplace_link: publicUrl("/buyer/marketplace"),
                },
              },
            })
            .catch(() => {});
        }

        // In-app notifications to each negotiating buyer company (best-effort)
        const uniqueBuyerCompanyIds = Array.from(
          new Set(negs.map((n) => n.buyer_company_id).filter(Boolean) as string[]),
        );
        for (const buyerCompanyId of uniqueBuyerCompanyIds) {
          const neg = negs.find((n) => n.buyer_company_id === buyerCompanyId);
          notifyCompanyUsers({
            companyId: buyerCompanyId,
            title: "Offer deactivated",
            body: `The offer "${offerTitle}" you were negotiating was deactivated by the supplier`,
            icon: "alert",
            category: "offers",
            linkUrl: neg ? `/buyer/negotiations/${neg.id}` : "/buyer/marketplace",
            relatedType: neg ? "negotiation" : "offer",
            relatedId: neg?.id ?? id,
          }).catch(() => {});
        }
      }

      setActive(false);
      setDeactivateOpen(false);
      auditLog({
        action: "offer.deactivated",
        category: "offer",
        entityType: "offer",
        entityId: id,
        entityLabel: formatOfferNumber(offer.offerNumber, offer.createdAt),
        details: { activeNegotiationsWithdrawn: negs?.length ?? 0, offerTitle },
        severity: "warn",
      });
      toast.success(
        negs && negs.length > 0
          ? "Offer deactivated. Negotiating buyers have been notified."
          : "Offer deactivated.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  }


  const totalKg = offer.items.reduce((s, it) => s + it.qtyKg, 0);
  const totalValuePerFcl = offer.items.reduce(
    (s, it) => s + it.qtyKg * it.pricePerKgUsd,
    0,
  );

  const supplierToggle = (
    <button
      type="button"
      className="so-detail-toggle"
      onClick={openToggle}
      aria-pressed={isActive}
    >
      <span className={`so-toggle-switch ${isActive ? "is-on" : ""}`} />
      {isActive ? t("supplier.offers.detail.deactivate") : t("supplier.offers.detail.activate")}
    </button>
  );

  const handleEdit = async () => {
    if (!offer) return;
    navigate(`/supplier/offers/new?id=${offer.id}`);
  };

  const handleClone = () => {
    if (!offer) return;
    navigate(`/supplier/offers/new?clone=${offer.id}`);
  };

  const supplierActions = (
    <>
      <button
        type="button"
        className="btn-tb"
        onClick={negotiations.length === 0 ? handleEdit : undefined}
        disabled={negotiations.length > 0}
        title={negotiations.length > 0 ? "Cannot edit — active negotiations in progress" : undefined}
        style={negotiations.length > 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
      >
        ✏️ Edit Offer
      </button>
      <button type="button" className="btn-tb" onClick={handleClone}>
        <CopyIcon size={14} /> {t("supplier.offers.detail.clone")}
      </button>
      <button
        type="button"
        className="btn-tb"
        onClick={() => alert(t("supplier.offers.detail.shareComingSoon"))}
      >
        <ShareIcon size={14} /> {t("supplier.offers.detail.share")}
      </button>
    </>
  );

  const banners = (
    <>
      {!isActive && (
        <div className="so-inactive-banner">
          {t("supplier.offers.detail.inactiveBanner")}
        </div>
      )}
      {negotiations.length > 0 && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            🤝 Active Negotiations ({negotiations.length})
          </div>
          {negotiations.map((n) => {
            const statusMap: Record<string, { label: string; bg: string; fg: string }> = {
              awaiting_supplier: { label: "Waiting your reply", bg: "#fee2e2", fg: "#b91c1c" },
              pending_buyer_review: { label: "Waiting buyer reply", bg: "#fef3c7", fg: "#92400e" },
              bid_accepted: { label: "Accepted", bg: "#dcfce7", fg: "#15803d" },
              offer_rejected: { label: "Rejected", bg: "#f3f4f6", fg: "#4b5563" },
            };
            const s = statusMap[n.status] ?? { label: n.status.replace(/_/g, " "), bg: "#fef3c7", fg: "#92400e" };
            const buyerName = n.buyer?.name?.trim() || `Buyer #${n.buyer_company_id.slice(0, 8)}`;
            const flag = countryFlag(n.buyer?.country);
            return (
              <a
                key={n.id}
                href={`/supplier/negotiations/${n.id}`}
                onClick={(e) => { e.preventDefault(); navigate(`/supplier/negotiations/${n.id}`); }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  marginBottom: 4,
                  textDecoration: "none",
                  color: "inherit",
                  fontSize: 12,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden style={{ fontSize: 14 }}>{flag}</span>
                  <span style={{ fontWeight: 600 }}>{buyerName}</span>
                  {n.buyer?.country && (
                    <span style={{ color: "#6b7280" }}>· {n.buyer.country}</span>
                  )}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 600,
                    background: s.bg,
                    color: s.fg,
                  }}
                >
                  {s.label}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </>
  );

  const firstItemPkg = (offer.items[0] as any)?.packaging ?? null;

  return (
    <>
      <button
        type="button"
        className="btn-back"
        onClick={() => navigate("/supplier/offers")}
        style={{ marginBottom: 12 }}
      >
        <ArrowLeftIcon size={14} /> {t("supplier.offers.detail.backToOffers")}
      </button>
      <div className="crumbs">
        <a onClick={(e) => { e.preventDefault(); navigate("/supplier"); }} href="/supplier">
          {t("supplier.offers.crumbHome")}
        </a>
        <span className="sep">›</span>
        <a onClick={(e) => { e.preventDefault(); navigate("/supplier/offers"); }} href="/supplier/offers">
          {t("supplier.offers.title")}
        </a>
        <span className="sep">›</span>
        <b>{offer.title}</b>
      </div>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>⚠️ Deactivate Offer?</DialogTitle>
            <DialogDescription>
              {activeNegCount > 0 ? (
                <>
                  This offer has <strong>{activeNegCount}</strong> active negotiation{activeNegCount > 1 ? "s" : ""}.
                </>
              ) : (
                "It will no longer be visible in the marketplace."
              )}
            </DialogDescription>
          </DialogHeader>
          {activeNegCount > 0 && (
            <div className="text-sm text-foreground">
              <p className="mb-2">Deactivating will:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Mark the offer as inactive</li>
                <li>Notify all negotiating buyers</li>
                <li>Cancel all active negotiations</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">This action cannot be undone.</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeactivateOpen(false)} disabled={deactivating}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
              disabled={deactivating}
            >
              {deactivating ? "Deactivating…" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div>{supplierToggle}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{supplierActions}</div>
      </div>

      <SupplierOfferBuyerStyleBody
        offer={offer}
        isActive={isActive}
        totalKg={totalKg}
        totalValuePerFcl={totalValuePerFcl}
        destinationPorts={destinationPorts}
        galleryImages={galleryImages}
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
        banners={banners}
        unit={unit}
        illustrativeLabel={t("supplier.offers.detail.illustrative")}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
   Buyer-style body for the supplier offer detail.
   Mirrors the layout used by BuyerOfferDetail (od-grid / od-right
   classes from mundus-offers.css) so suppliers see their own
   offers with the same clean layout — keeping supplier-only
   info (asking / floor prices, banners with negotiations).
   ──────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────
   Supplier offer detail body using the shared card layout.
   Same content as buyer view + supplier-only Asking / Floor
   columns and inactive banner.
   ──────────────────────────────────────────────────────────── */
function SupplierOfferBuyerStyleBody({
  offer,
  isActive,
  totalKg,
  totalValuePerFcl,
  galleryImages,
  moreOpen,
  setMoreOpen,
  banners,
  unit,
  illustrativeLabel,
}: {
  offer: SupplierOffer;
  isActive: boolean;
  totalKg: number;
  totalValuePerFcl: number;
  destinationPorts: { id: string; name: string; code: string }[];
  galleryImages: ReturnType<typeof useOfferImages>;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  banners: React.ReactNode;
  unit: WeightUnit;
  illustrativeLabel: string;
}) {
  const { t } = useTranslation();
  const items = offer.items;
  const originCode = offer.originCountryCode || countryToCode(offer.originCountry);
  const firstDest = offer.destinations[0] ?? null;
  const destCode = firstDest?.code || countryToCode(firstDest?.name ?? null);
  const destinations = offer.destinations.map((d) => d.name);
  const condition = offer.condition;
  const incotermsFormatted = offer.incoterms.map((i) =>
    formatIncotermWithPlace(i, {
      originPort: offer.originPort,
      destinationNames: destinations,
    }),
  );
  const containerLabel = `${offer.fclCount ?? 1} × ${offer.containerSize ?? ""} FCL`.trim();
  const cardItems = items.map((it, idx) => {
    const pkg = (it as any).packaging;
    const g = galleryImages.find(
      (gi) => (gi.label ?? "").trim().toLowerCase() === (it.name ?? "").trim().toLowerCase(),
    );
    return {
      id: String(idx),
      name: it.name,
      specLabel: (it as any).agingMethod ? `Spec · ${(it as any).agingMethod}` : null,
      packing: pkg,
      qtyKg: it.qtyKg,
      pricePerKgUsd: it.pricePerKgUsd,
      askingPerKgUsd: it.pricePerKgUsd * 1.05,
      floorPerKgUsd: it.pricePerKgUsd * 0.9,
      imageSrc: g?.src ?? null,
    };
  });

  return (
    <>
      {banners}
      {!isActive && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            marginBottom: 14,
            fontSize: 13,
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          🚫 {t("supplier.offers.detail.inactiveBanner", "This offer is currently inactive and is not visible to buyers.")}
        </div>
      )}

      <OfferDetailCards
        offerNumber={formatOfferNumber(offer.offerNumber, offer.createdAt)}
        title={offer.title}
        category={offer.category}
        condition={condition}
        totalValueUsd={totalValuePerFcl}
        totalQtyKg={totalKg}
        containerLabel={containerLabel}
        shipmentLabel={offer.shipmentLabel}
        origin={{ country: offer.originCountry, port: offer.originPort, code: originCode }}
        destination={{
          country: firstDest?.name ?? null,
          port: null,
          code: destCode,
          extraCount: Math.max(0, offer.destinations.length - 1),
        }}
        incoterms={incotermsFormatted}
        paymentTerms={offer.paymentTerms}
        containerSize={offer.containerSize}
        containerCount={offer.fclCount ?? 1}
        createdAt={offer.createdAt}
        items={cardItems}
        showSupplierPricing
        gallery={galleryImages}
        illustrativeLabel={illustrativeLabel}
        unit={unit}
      />

      <div style={{ marginTop: 14 }}>
        <button
          className="od-more-toggle"
          onClick={() => setMoreOpen(!moreOpen)}
          type="button"
        >
          <span>{t("buyer.offerDetail.moreInfo", "More information")}</span>
          <ChevronDownIcon
            size={14}
            style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
          />
        </button>
        {moreOpen && (
          <div className="od-more-content">
            <div style={{ display: "grid", gap: 10, fontSize: 13, color: "#374151" }}>
              {offer.paymentTerms && (
                <div><strong>Payment terms:</strong> {offer.paymentTerms}</div>
              )}
              {offer.observation && (
                <div><strong>Notes:</strong> {offer.observation}</div>
              )}
              {offer.viewCount != null && (
                <div style={{ color: "#6b7280", fontSize: 12 }}>Views: {offer.viewCount}</div>
              )}
              {offer.proposalCount != null && (
                <div style={{ color: "#6b7280", fontSize: 12 }}>Proposals: {offer.proposalCount}</div>
              )}
              {offer.exwPickupLocation && offer.incoterms.includes("EXW") && (
                <div style={{ color: "#92400e" }}>
                  📍 EXW Pickup: <strong>{offer.exwPickupLocation}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
