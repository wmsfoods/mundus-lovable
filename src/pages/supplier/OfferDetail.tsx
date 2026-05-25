import { useMemo, useState, useEffect } from "react";
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
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { supabase } from "@/integrations/supabase/client";
import { formatOfferNumber } from "@/lib/offerNumber";
import { OfferImageGallery } from "@/components/offer/OfferImageGallery";
import { useOfferImages } from "@/hooks/useOfferImages";
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
import { useOfferDestinationPorts, OfferDestinationPorts } from "@/components/offer/OfferDestinationPorts";

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
  const [negotiations, setNegotiations] = useState<Array<{
    id: string;
    status: string;
    buyer_company_id: string;
    incoterm: string | null;
    created_at: string;
    updated_at: string;
  }>>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("id, status, buyer_company_id, incoterm, created_at, updated_at")
        .eq("offer_id", id)
        .not("status", "in", "(expired,offer_withdrawn)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!cancelled) setNegotiations(data ?? []);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const { offers: realOffers, loading: offersLoading } = useRealSupplierOffers();
  const offer: SupplierOffer | undefined = useMemo(
    () => realOffers.find((o) => o.id === id),
    [id, realOffers]
  );

  const galleryImages = useOfferImages(offer?.items ?? []);
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
        {negotiations.length === 0 ? (
          <button
            type="button"
            className="btn-tb"
            onClick={async () => {
              if (!offer) return;
              try {
                const { data: row, error } = await supabase
                  .from("offers")
                  .select(`
                    id, container_size, total_fcl, payment_terms,
                    is_halal, is_kosher, cut_region, exw_pickup_location,
                    items:offer_items (
                      amount, price, minimum_price, condition, aging_method,
                      customer_product:customer_products (
                        name,
                        standard_product:standard_products ( product_number )
                      )
                    ),
                    markets:offer_markets ( market:markets ( country:countries ( english_name ) ) ),
                    incoterms:offer_allowed_incoterms ( incoterm_type )
                  `)
                  .eq("id", offer.id)
                  .maybeSingle();
                if (error || !row) throw error ?? new Error("Offer not found");

                const editOffer = {
                  offerId: offer.id,
                  offerNumber: offer.offerNumber,
                  category: offer.category,
                  condition: offer.condition,
                  containerSize: (row as any).container_size ?? offer.containerSize ?? "40ft",
                  containerCount: Number((row as any).total_fcl ?? offer.fclCount ?? 1) || 1,
                  paymentTerms: (row as any).payment_terms ?? offer.paymentTerms ?? "",
                  isHalal: !!(row as any).is_halal,
                  isKosher: !!(row as any).is_kosher,
                  cutRegion: ((row as any).cut_region as "global" | "us") ?? "global",
                  exwCity: (row as any).exw_pickup_location ?? "",
                  destinationCountries: ((row as any).markets ?? [])
                    .map((m: any) => m?.market?.country?.english_name)
                    .filter(Boolean) as string[],
                  incoterms: ((row as any).incoterms ?? []).map((i: any) => i.incoterm_type) as string[],
                  items: ((row as any).items ?? []).map((it: any) => ({
                    name: it.customer_product?.name ?? "",
                    productNumber: it.customer_product?.standard_product?.product_number ?? null,
                    amount: Number(it.amount ?? 0),
                    price: Number(it.price ?? 0),
                    minimumPrice: Number(it.minimum_price ?? it.price ?? 0),
                    condition: it.condition ?? offer.condition,
                    agingMethod: it.aging_method ?? null,
                  })),
                };
                navigate("/supplier/offers/create", { state: { editOffer } });
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Failed to load offer for editing";
                toast.error(msg);
              }
            }}
          >
            ✏️ Edit Offer
          </button>
        ) : (
          <button
            type="button"
            className="btn-tb"
            disabled
            title="Cannot edit — active negotiations in progress"
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            ✏️ Edit Offer
          </button>
        )}
          <button
            type="button"
            className="btn-tb"
            onClick={async () => {
              if (!offer) return;
              try {
                const { data: row, error } = await supabase
                  .from("offers")
                  .select(`
                    id, container_size, total_fcl, payment_terms,
                    is_halal, is_kosher, cut_region, exw_pickup_location,
                    items:offer_items (
                      amount, price, minimum_price, condition, aging_method,
                      customer_product:customer_products (
                        name,
                        standard_product:standard_products ( product_number )
                      )
                    ),
                    markets:offer_markets ( market:markets ( country:countries ( english_name ) ) ),
                    incoterms:offer_allowed_incoterms ( incoterm_type )
                  `)
                  .eq("id", offer.id)
                  .maybeSingle();
                if (error || !row) throw error ?? new Error("Offer not found");

                const cloneFrom = {
                  category: offer.category,
                  condition: offer.condition,
                  containerSize: (row as any).container_size ?? offer.containerSize ?? "40ft",
                  containerCount: Number((row as any).total_fcl ?? offer.fclCount ?? 1) || 1,
                  paymentTerms: (row as any).payment_terms ?? offer.paymentTerms ?? "",
                  isHalal: !!(row as any).is_halal,
                  isKosher: !!(row as any).is_kosher,
                  cutRegion: ((row as any).cut_region as "global" | "us") ?? "global",
                  exwCity: (row as any).exw_pickup_location ?? "",
                  destinationCountries: ((row as any).markets ?? [])
                    .map((m: any) => m?.market?.country?.english_name)
                    .filter(Boolean) as string[],
                  incoterms: ((row as any).incoterms ?? []).map((i: any) => i.incoterm_type) as string[],
                  items: ((row as any).items ?? []).map((it: any) => ({
                    name: it.customer_product?.name ?? "",
                    productNumber: it.customer_product?.standard_product?.product_number ?? null,
                    amount: Number(it.amount ?? 0),
                    price: Number(it.price ?? 0),
                    minimumPrice: Number(it.minimum_price ?? it.price ?? 0),
                    condition: it.condition ?? offer.condition,
                    agingMethod: it.aging_method ?? null,
                  })),
                };
                navigate("/supplier/offers/create", { state: { cloneFrom } });
                toast.success("Offer data loaded — review and publish as a new offer");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Failed to clone offer";
                toast.error(msg);
              }
            }}
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

      {negotiations.length > 0 && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fafafa",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            🤝 Active Negotiations ({negotiations.length})
          </div>
          {negotiations.map((n) => {
            const isAwaiting = n.status === "awaiting_supplier";
            const isClosed = n.status === "bid_accepted";
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
                <span>Buyer #{n.buyer_company_id.slice(0, 8)} · {n.incoterm || "FOB"}</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 600,
                    background: isClosed ? "#dcfce7" : isAwaiting ? "#fee2e2" : "#fef3c7",
                    color: isClosed ? "#15803d" : isAwaiting ? "#b91c1c" : "#92400e",
                  }}
                >
                  {n.status.replace(/_/g, " ")}
                </span>
              </a>
            );
          })}
        </div>
      )}

      <div className="od-grid">
        <OfferImageGallery
          images={galleryImages}
          illustrativeLabel={t("supplier.offers.detail.illustrative")}
        />

        <div className="od-right">
          <div className="od-title-row">
            <span className="oc-chip"><TagIcon size={18} /></span>
            <div className="od-title-block">
              <h1 className="od-title">{offer.title}</h1>
              <div className="od-subtitle">
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    color: "#9ca3af",
                    marginRight: 8,
                  }}
                >
                  {formatOfferNumber(offer.offerNumber, offer.createdAt)}
                </span>
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
                <OfferDestinationPorts ports={destinationPorts} />
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

          {offer.exwPickupLocation && offer.incoterms.includes("EXW") && (
            <div
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
              <strong>{offer.exwPickupLocation}</strong>
            </div>
          )}

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
              <MoreInfoBlock
                observation={offer.observation}
                isHalal={!!(offer as any).isHalal}
                isKosher={!!(offer as any).isKosher}
                paymentTerms={offer.paymentTerms}
                plants={Array.from(
                  new Set(
                    offer.items
                      .map((it: any) => it.plant)
                      .filter((p: any) => p),
                  ),
                ) as string[]}
                createdAt={offer.createdAt}
                offerNumber={formatOfferNumber(offer.offerNumber, offer.createdAt)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MoreInfoBlock({
  observation,
  isHalal,
  isKosher,
  paymentTerms,
  plants,
  createdAt,
  offerNumber,
}: {
  observation?: string | null;
  isHalal?: boolean;
  isKosher?: boolean;
  paymentTerms?: string | null;
  plants?: string[];
  createdAt?: string | null;
  offerNumber?: string;
}) {
  const hasAny =
    !!observation || isHalal || isKosher || !!paymentTerms || (plants && plants.length > 0) || !!createdAt || !!offerNumber;
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
      {plants && plants.length > 0 && (
        <div><strong>Plant numbers:</strong> {plants.join(", ")}</div>
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