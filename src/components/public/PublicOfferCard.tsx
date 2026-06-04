import { useTranslation } from "react-i18next";
import { Factory, ChevronRight } from "lucide-react";
import { KnifeForkIcon, GridIcon, FlagSVG } from "@/components/icons";
import { countryToCode } from "@/lib/countryCodes";
import { formatOfferNumber } from "@/lib/offerNumber";
import { formatIncotermWithPlace } from "@/lib/incotermPricing";
import type { PublicOffer } from "@/hooks/usePublicOffers";
import { GlowCard } from "@/components/ui/spotlight-card";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShipment(month: number, year: number): string {
  const m = MONTH_NAMES[(month - 1) % 12] ?? "";
  return `${m} ${year}`;
}

function formatMT(kg: number): string {
  const mt = kg / 1000;
  if (Number.isInteger(mt)) return mt.toString();
  return mt.toFixed(1);
}

export default function PublicOfferCard({
  offer,
  onReveal,
  onOpenDetails,
}: {
  offer: PublicOffer;
  onReveal: () => void;
  onOpenDetails?: () => void;
}) {
  const { t } = useTranslation();
  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];

  const category =
    firstItem?.category_name ||
    firstItem?.category_code ||
    t("buyer.offers.card.defaultCategory", "Product");
  const condition = firstItem?.condition ?? "—";

  const title = mixed
    ? t("buyer.offers.card.mixedTitle", { count: items.length, defaultValue: `Mixed Container — ${items.length} cuts` })
    : t("buyer.offers.card.fullContainerOneCut", { defaultValue: "Full Container — 1 Cut" });

  const marketsList = (offer.markets ?? [])
    .map((m) => m.country)
    .filter((c): c is string => !!c);
  const firstMarket = marketsList[0] ?? null;
  const extraMarkets = Math.max(0, marketsList.length - 1);
  const destinationLabel = firstMarket
    ? extraMarkets > 0 ? `${firstMarket} +${extraMarkets}` : firstMarket
    : "—";
  const allDestinations = marketsList.map((n) => ({ name: n, code: countryToCode(n) }));

  const firstIncoterm = offer.incoterms?.[0] ?? null;
  const extraIncoterms = Math.max(0, (offer.incoterms?.length ?? 0) - 1);
  const fmtIc = (ic: string | null) =>
    formatIncotermWithPlace(ic, {
      originPort: offer.origin_port,
      destinationNames: marketsList,
    });
  const incotermLabel = firstIncoterm
    ? extraIncoterms > 0
      ? `${firstIncoterm} +${extraIncoterms}`
      : fmtIc(firstIncoterm)
    : offer.origin_port || "—";
  const allIncoterms = offer.incoterms ?? [];

  const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);

  const originCode = countryToCode(offer.origin_country);
  const destCode = countryToCode(firstMarket);

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReveal();
  };

  const handleOpenDetails = () => {
    onOpenDetails?.();
  };

  return (
    <GlowCard glowColor="mundus" radius={14}>
    <article
      className="oc"
      style={{ position: "relative", cursor: onOpenDetails ? "pointer" : undefined }}
      onClick={handleOpenDetails}
      role={onOpenDetails ? "button" : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      onKeyDown={(e) => {
        if (onOpenDetails && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleOpenDetails();
        }
      }}
    >
      <div className="oc-head">
        <div className="oc-head-l">
          <span className="oc-chip">
            <KnifeForkIcon size={14} />
          </span>
          <span className="oc-cat">{category}</span>
          <span className="dot-sep" />
          <span className="oc-temp">{condition}</span>
          <span className="dot-sep" />
          <span
            className="oc-num"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {formatOfferNumber(offer.offer_number, offer.created_at)}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span
            className="status-pill"
            style={{ background: "#e6f7ed", color: "#15803d" }}
          >
            <span className="status-dot" style={{ background: "#16a34a" }} />
            {t("buyer.offers.status.active", "Available")}
          </span>
          {offer.total_fcl != null && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 12,
                background: offer.remaining_fcl != null && offer.remaining_fcl < offer.total_fcl ? "#fef3c7" : "#e6f7ed",
                color: offer.remaining_fcl != null && offer.remaining_fcl < offer.total_fcl ? "#92400e" : "#15803d",
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {(offer.remaining_fcl ?? offer.total_fcl)} of {offer.total_fcl} FCL available
            </span>
          )}
          {offer.is_halal && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 12,
                background: "#ecfdf5",
                color: "#047857",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              HALAL
            </span>
          )}
          {offer.is_kosher && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 12,
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              KOSHER
            </span>
          )}
        </span>
      </div>

      {offer.origin_country && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
            fontSize: 12,
            color: "#374151",
            fontWeight: 500,
          }}
        >
          <span style={{ color: "#9ca3af", fontWeight: 600, fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {t("buyer.offers.card.origin", "Origin")}:
          </span>
          {originCode && <FlagSVG code={originCode} size={13} />}
          {offer.origin_country}
        </div>
      )}

      <div className="oc-title-block">
        <div className="oc-title">{title}</div>
        <div
          className="oc-supplier"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontStyle: "italic",
            color: "#9ca3af",
          }}
          title={t("public.home.hiddenSupplier", "Hidden — reveal to see") as string}
        >
          <Factory size={14} strokeWidth={1.75} aria-hidden />
          <span style={{ letterSpacing: "0.15em" }}>•••••••••</span>
          <span
            style={{
              fontStyle: "normal",
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 999,
              background: "#fef3c7",
              color: "#92400e",
              letterSpacing: 0,
            }}
          >
            {t("public.home.hiddenBadge", "Hidden")}
          </span>
        </div>
        <div className="cut-chips">
          {firstItem && (
            <span className="cut-chip">
              {(firstItem.product_name ?? "Product / Cut").split(",")[0]}
            </span>
          )}
          {items.length > 1 && (
            <button
              type="button"
              className="cut-chip is-more"
              onClick={(e) => { e.stopPropagation(); onOpenDetails?.(); }}
              style={{ cursor: "pointer", border: "none" }}
              title={t("buyer.offers.card.moreCuts", { count: items.length - 1, defaultValue: `+${items.length - 1} more` })}
            >
              +{items.length - 1}
            </button>
          )}
        </div>
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.destination", "Destination")}</span>
          <span className="cm-value dest-hover-wrap">
            {destCode && <FlagSVG code={destCode} size={13} />}
            {destinationLabel}
            {allDestinations.length > 1 && (
              <div className="dest-tooltip">
                <div className="dest-tooltip-title">Available destinations:</div>
                {allDestinations.map((d, i) => (
                  <div key={i} className="dest-tooltip-row">
                    <FlagSVG code={d.code} size={12} /> {d.name}
                  </div>
                ))}
              </div>
            )}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.incoterm", "Incoterm")}</span>
          <span className="cm-value dest-hover-wrap">
            {incotermLabel}
            {allIncoterms.length > 1 && (
              <div className="dest-tooltip">
                <div className="dest-tooltip-title">Available incoterms:</div>
                {allIncoterms.map((inc, i) => (
                  <div key={i} className="dest-tooltip-row">{fmtIc(inc)}</div>
                ))}
              </div>
            )}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.shipment", "Shipment")}</span>
          <span className="cm-value">
            {formatShipment(offer.shipment_month, offer.shipment_year)}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.volume", "Volume")}</span>
          <span className="cm-value">{formatMT(totalKg)} MT</span>
        </div>
      </div>

      <div className="oc-footer">
        <div className="oc-price">
          <span className="cur">{t("buyer.offers.card.qty", "QTY")}</span>
          <span className="amt">{formatMT(totalKg)}</span>
          <span className="unit">
            MT · {offer.container_size}
            {offer.total_fcl ? ` (${offer.total_fcl})` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={handleReveal}
          className="oc-cta"
          style={{
            background: "#B64769",
            color: "#fff",
            border: "none",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔓 {t("public.home.reveal", "Reveal supplier")}
        </button>
      </div>
      {onOpenDetails && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            marginTop: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#8B2E4F",
          }}
        >
          {t("public.home.viewDetails", "View cuts & pricing")}
          <ChevronRight size={12} />
        </div>
      )}
    </article>
    </GlowCard>
  );
}