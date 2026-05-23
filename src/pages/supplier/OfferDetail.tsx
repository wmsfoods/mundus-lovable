import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
          onClick={() => setActive(!isActive)}
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