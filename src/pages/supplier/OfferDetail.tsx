
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
