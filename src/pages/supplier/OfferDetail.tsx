import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CopyIcon,
  ShareIcon,
} from "@/components/icons";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { supabase } from "@/integrations/supabase/client";
import { formatOfferNumber } from "@/lib/offerNumber";
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
import { auditLog } from "@/lib/auditLog";
import { useOfferDestinationPorts } from "@/components/offer/OfferDestinationPorts";
import { OfferDetailLayout, type OfferItemRow } from "@/components/offer/OfferDetailLayout";
import { countryFlag } from "@/lib/countryFlags";

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

  const items: OfferItemRow[] = offer.items.map((it, i) => ({
    id: String(i),
    image: (it as any).image_url ?? null,
    name: it.name,
    subline: (it as any).plant ? `Plant ${(it as any).plant}` : null,
    packaging: (it as any).packaging ?? null,
    qtyKg: it.qtyKg,
    priceKg: it.pricePerKgUsd,
    askingKg: it.pricePerKgUsd * 1.05,
    floorKg: it.pricePerKgUsd * 0.9,
  }));

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
    try {
      const { data: row, error } = await supabase
        .from("offers")
        .select(`
          id, container_size, total_fcl, payment_terms, origin_port_id,
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
        originPortId: (row as any).origin_port_id ?? null,
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
      navigate("/supplier/offers/new", { state: { editOffer } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load offer for editing";
      toast.error(msg);
    }
  };

  const handleClone = async () => {
    if (!offer) return;
    try {
      const { data: row, error } = await supabase
        .from("offers")
        .select(`
          id, container_size, total_fcl, payment_terms, origin_port_id,
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
        originPortId: (row as any).origin_port_id ?? null,
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
      navigate("/supplier/offers/new", { state: { cloneFrom } });
      toast.success("Offer data loaded — review and publish as a new offer");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to clone offer";
      toast.error(msg);
    }
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

      <OfferDetailLayout
        offerNumberLabel={formatOfferNumber(offer.offerNumber, offer.createdAt)}
        title={offer.title}
        category={offer.category}
        cutCount={offer.items.length}
        specCount={offer.items.length}
        packagingLabel={firstItemPkg}
        shipmentLabel={offer.shipmentLabel}
        originCountry={offer.originCountry}
        originCountryCode={offer.originCountryCode}
        originPort={offer.originPort}
        condition={offer.condition}
        destinations={offer.destinations}
        destinationPorts={destinationPorts}
        totalKg={totalKg}
        totalValueUsd={offer.pricePerFclUsd}
        fclCount={offer.fclCount}
        containerSize={offer.containerSize}
        items={items}
        showSupplierColumns
        paymentTerms={offer.paymentTerms}
        incoterms={offer.incoterms}
        createdAt={offer.createdAt}
        galleryImages={galleryImages}
        illustrativeLabel={t("supplier.offers.detail.illustrative")}
        toggle={supplierToggle}
        topActions={supplierActions}
        banners={banners}
      />
    </>
  );
}
