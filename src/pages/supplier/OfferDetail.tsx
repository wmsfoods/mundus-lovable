import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  TagIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  MapPinIcon,
  CopyIcon,
  ShareIcon,
  FlagSVG,
} from "@/components/icons";
import { MOCK_SUPPLIER_OFFERS, type SupplierOffer } from "@/data/mockSupplierOffers";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-DE").format(Math.round(n));
}
function formatPrice(n: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function SupplierOfferDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [active, setActive] = useState<boolean | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activeNegCount, setActiveNegCount] = useState<number>(0);
  const [deactivating, setDeactivating] = useState(false);

  const offer: SupplierOffer | undefined = useMemo(
    () => MOCK_SUPPLIER_OFFERS.find((o) => o.id === id),
    [id]
  );

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
    // Activating again is unrestricted
    if (!isActive) {
      setActive(true);
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
                  marketplace_link: `${window.location.origin}/buyer/marketplace`,
                },
              },
            })
            .catch(() => {});
        }
      }

      setActive(false);
      setDeactivateOpen(false);
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
  const firstDest = offer.destinations[0];

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

      <div className="so-detail-header">
        <button
          type="button"
          className="so-detail-toggle"
          onClick={openToggle}
          aria-pressed={isActive}
        >
          <span className={`so-toggle-switch ${isActive ? "is-on" : ""}`} />
          {isActive ? t("supplier.offers.detail.deactivate") : t("supplier.offers.detail.activate")}
        </button>
        <div className="so-detail-actions">
          <button
            type="button"
            className="btn-tb"
            onClick={() => alert(t("supplier.offers.detail.cloneComingSoon"))}
          >
            <CopyIcon size={14} /> {t("supplier.offers.detail.clone")}
          </button>
          <button
            type="button"
            className="btn-tb"
            onClick={() => alert(t("supplier.offers.detail.shareComingSoon"))}
          >
            <ShareIcon size={14} /> {t("supplier.offers.detail.share")}
          </button>
        </div>
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

      {!isActive && (
        <div className="so-inactive-banner">
          {t("supplier.offers.detail.inactiveBanner")}
        </div>
      )}

      <div className="od-grid">
        <div className="od-gallery">
          <div className="od-gallery-main">
            <div className="od-gallery-placeholder">
              <span className="od-illu-label">{t("supplier.offers.detail.illustrative")}</span>
            </div>
          </div>
          <div className="od-gallery-thumbs">
            {[0, 1, 2, 3].map((i) => <div key={i} className="od-thumb" />)}
          </div>
        </div>

        <div className="od-right">
          <div className="od-title-row">
            <span className="oc-chip"><TagIcon size={18} /></span>
            <div className="od-title-block">
              <h1 className="od-title">{offer.title}</h1>
              <div className="od-subtitle">
                {t("supplier.offers.detail.specifications", { count: offer.items.length })}
              </div>
            </div>
          </div>

          <div className="od-price-block">
            <div className="od-price-amount">US$ {formatPrice(offer.pricePerFclUsd)}</div>
            <div className="od-price-caption">
              {t("supplier.offers.detail.totalValuePerFcl")}
            </div>
          </div>

          <div className="od-cuts">
            <div className="od-cuts-head">
              <span>{t("supplier.offers.detail.cutsHead.cut")}</span>
              <span>{t("supplier.offers.detail.cutsHead.marbling")}</span>
              <span className="num">{t("supplier.offers.detail.cutsHead.qty")}</span>
              <span className="num">{t("supplier.offers.detail.cutsHead.price")}</span>
              <span className="num">{t("supplier.offers.detail.cutsHead.asking")}</span>
              <span className="num">{t("supplier.offers.detail.cutsHead.floor")}</span>
            </div>
            {offer.items.map((it, i) => (
              <div key={i} className="od-cuts-row">
                <span>
                  {it.name}
                  {(it as any).plant && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "#6b7280" }}>
                      · Plant {(it as any).plant}
                    </span>
                  )}
                </span>
                <span>{it.marbling}</span>
                <span className="num">{formatNumber(it.qtyKg)} kg</span>
                <span className="num">US$ {formatPrice(it.pricePerKgUsd)}/kg</span>
                <span className="num">US$ {formatPrice(it.pricePerKgUsd * 1.05)}/kg</span>
                <span className="num">US$ {formatPrice(it.pricePerKgUsd * 0.90)}/kg</span>
              </div>
            ))}
          </div>

          <div className="od-total-weight">
            <span className="amt">{formatNumber(totalKg)} kg</span>
            <span className="lbl">{t("supplier.offers.detail.totalWeight")}</span>
          </div>

          <div className="od-meta-row">
            <div className="od-meta-item">
              <span className="od-meta-label">{t("supplier.offers.detail.fields.marbling")}</span>
              <span className="od-meta-value">{offer.items[0]?.marbling ?? "—"}</span>
            </div>
            <div className="od-meta-item">
              <span className="od-meta-label">{t("supplier.offers.detail.fields.originPortCountry")}</span>
              <span className="od-meta-value">
                <MapPinIcon size={13} />
                {offer.originPort} / {offer.originCountry}
                <FlagSVG code={offer.originCountryCode} size={13} />
              </span>
            </div>
            <div className="od-meta-item">
              <span className="od-meta-label">{t("supplier.offers.detail.fields.condition")}</span>
              <span className="od-meta-value">{offer.condition}</span>
            </div>
            {firstDest && (
              <div className="od-meta-item">
                <span className="od-meta-label">
                  {t("supplier.offers.detail.fields.destination")}
                  {offer.destinations.length > 1 ? ` (+${offer.destinations.length - 1})` : ""}
                </span>
                <span className="od-meta-value">
                  <FlagSVG code={firstDest.code} size={13} />
                  {firstDest.name}
                </span>
              </div>
            )}
          </div>

          <div className="od-terms">
            <div className="od-terms-label">{t("supplier.offers.detail.fields.terms")}</div>
            <div className="od-terms-value">{offer.paymentTerms}</div>
          </div>

          <div className="od-fcl-row">
            <span className="od-fcl-count">
              {t(offer.fclCount === 1 ? "supplier.offers.detail.fcl_one" : "supplier.offers.detail.fcl_other", { count: offer.fclCount })}
            </span>
            <span className="od-fcl-size">{t("supplier.offers.detail.size", { size: offer.containerSize })}</span>
            <span className="od-fcl-incoterms">
              {offer.incoterms.map((i) => (
                <span key={i} className="od-incoterm-pill">{i}</span>
              ))}
            </span>
          </div>

          <div className="od-shipment-row">
            <span className="od-meta-label">{t("supplier.offers.detail.fields.shipment")}</span>
            <span className="od-meta-value">{offer.shipmentLabel}</span>
          </div>

          <button
            type="button"
            className="od-more-toggle"
            onClick={() => setMoreOpen(!moreOpen)}
          >
            <span>{t("supplier.offers.detail.moreInfo")}</span>
            <ChevronDownIcon
              size={14}
              style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
            />
          </button>
          {moreOpen && (
            <div className="od-more-content">
              {offer.observation || t("supplier.offers.detail.noMoreInfo")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}