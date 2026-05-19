import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  TagIcon,
  KnifeForkIcon,
  ArrowRightIcon,
  SearchIcon,
  GridIcon,
  FlagSVG,
} from "@/components/icons";
import { useOffers, type OfferWithDetails } from "@/hooks/useOffers";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COUNTRY_CODE_MAP: Record<string, string> = {
  argentina: "AR",
  australia: "AU",
  brazil: "BR",
  canada: "CA",
  chile: "CL",
  china: "CN",
  egypt: "EG",
  france: "FR",
  germany: "DE",
  "hong kong": "HK",
  india: "IN",
  italy: "IT",
  japan: "JP",
  jordan: "JO",
  mexico: "MX",
  netherlands: "NL",
  paraguay: "PY",
  poland: "PL",
  "saudi arabia": "SA",
  "south africa": "ZA",
  "south korea": "KR",
  spain: "ES",
  turkey: "TR",
  "united arab emirates": "AE",
  uae: "AE",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  uruguay: "UY",
  vietnam: "VN",
};

function countryToCode(name: string | null | undefined): string {
  if (!name) return "";
  return COUNTRY_CODE_MAP[name.trim().toLowerCase()] ?? "";
}

function formatShipment(month: number, year: number): string {
  const m = MONTH_NAMES[(month - 1) % 12] ?? "";
  return `${m} ${year}`;
}

function formatMT(kg: number): string {
  const mt = kg / 1000;
  if (Number.isInteger(mt)) return mt.toString();
  return mt.toFixed(1);
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

function OfferCard({ offer, onOpen }: { offer: OfferWithDetails; onOpen: () => void }) {
  const { t } = useTranslation();
  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];

  const category =
    firstItem?.customer_product?.standard_product?.product_category?.name_en ??
    t("buyer.offers.card.defaultCategory");
  const condition = firstItem?.condition ?? "—";

  const title = mixed
    ? t("buyer.offers.card.mixedTitle", { count: items.length })
    : firstItem?.customer_product?.name ?? "Offer";

  const firstMarket = offer.markets?.[0]?.market?.country?.english_name ?? null;
  const extraMarkets = Math.max(0, (offer.markets?.length ?? 0) - 1);
  const destinationLabel = firstMarket
    ? extraMarkets > 0
      ? `${firstMarket} +${extraMarkets}`
      : firstMarket
    : "—";

  const firstIncoterm = offer.incoterms?.[0]?.incoterm_type ?? null;
  const extraIncoterms = Math.max(0, (offer.incoterms?.length ?? 0) - 1);
  const incotermLabel = firstIncoterm
    ? extraIncoterms > 0
      ? `${firstIncoterm} +${extraIncoterms}`
      : `${firstIncoterm} ${offer.origin_port}`
    : offer.origin_port;

  const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);

  const status = statusFor(offer.status);
  const statusLabel = t(`buyer.offers.status.${status.key}`);

  const originCode = countryToCode(offer.origin_country);
  const destCode = countryToCode(firstMarket);

  return (
    <article
      className="oc"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
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
          {mixed && (
            <span className="mixed-badge">
              <GridIcon size={9} /> {t("buyer.offers.card.cuts", { count: items.length })}
            </span>
          )}
        </div>
        <span className="status-pill" style={{ background: status.bg, color: status.fg }}>
          <span className="status-dot" style={{ background: status.dot }} />
          {statusLabel}
        </span>
      </div>

      <div className="oc-title-block">
        <div className="oc-title">{title}</div>
        {mixed ? (
          <div className="cut-chips">
            {items.slice(0, 3).map((it) => (
              <span key={it.id} className="cut-chip">
                {(it.customer_product?.name ?? "Cut").split(",")[0]}
              </span>
            ))}
            {items.length > 3 && (
              <span className="cut-chip is-more">
                {t("buyer.offers.card.moreCuts", { count: items.length - 3 })}
              </span>
            )}
          </div>
        ) : (
          <div className="oc-cut-text">
            {firstItem?.customer_product?.name ?? offer.supplier_name}
          </div>
        )}
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.origin")}</span>
          <span className="cm-value">
            {originCode && <FlagSVG code={originCode} size={13} />}
            {offer.origin_country}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.destination")}</span>
          <span className="cm-value">
            {destCode && <FlagSVG code={destCode} size={13} />}
            {destinationLabel}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.incoterm")}</span>
          <span className="cm-value">{incotermLabel}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.shipment")}</span>
          <span className="cm-value">
            {formatShipment(offer.shipment_month, offer.shipment_year)}
          </span>
        </div>
      </div>

      <div className="oc-footer">
        <div className="oc-price">
          <span className="cur">{t("buyer.offers.card.qty")}</span>
          <span className="amt">{formatMT(totalKg)}</span>
          <span className="unit">
            MT · {offer.container_size}
            {offer.total_fcl ? ` (${offer.total_fcl})` : ""}
          </span>
        </div>
        <span className="oc-cta">
          {mixed ? t("buyer.offers.card.viewBreakdown") : t("buyer.offers.card.viewDetails")}
          <ArrowRightIcon size={12} />
        </span>
      </div>
    </article>
  );
}

export default function BuyerOffers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { offers, loading, error } = useOffers();

  const total = offers.length;
  const totalMT = offers.reduce(
    (sum, o) => sum + (o.items ?? []).reduce((s, it) => s + Number(it.amount ?? 0), 0),
    0
  ) / 1000;

  return (
    <>
      <div className="crumbs">
        <a onClick={(e) => { e.preventDefault(); navigate("/buyer"); }} href="/buyer">
          {t("buyer.offers.crumbHome")}
        </a>
        <span className="sep">›</span>
        <b>{t("buyer.offers.title")}</b>
      </div>

      <div className="page-title">
        <span className="chip">
          <TagIcon size={20} />
        </span>
        <h1>{t("buyer.offers.title")}</h1>
      </div>

      <div className="result-bar">
        <span className="result-count">
          {loading
            ? t("buyer.offers.loading")
            : (
              <>
                {t(total === 1 ? "buyer.offers.showing_one" : "buyer.offers.showing_other", {
                  count: total,
                  mt: totalMT % 1 === 0 ? totalMT : totalMT.toFixed(1),
                }).split(/(<1>.*?<\/1>)/).map((chunk, i) => {
                  const m = chunk.match(/^<1>(.*)<\/1>$/);
                  return m ? <b key={i}>{m[1]}</b> : <span key={i}>{chunk}</span>;
                })}
              </>
            )}
        </span>
      </div>

      {error ? (
        <div className="offers-error">{t("buyer.offers.loadError", { error })}</div>
      ) : loading ? (
        <div className="offers-loading">{t("buyer.offers.loadingShort")}</div>
      ) : offers.length === 0 ? (
        <div className="empty-state">
          <SearchIcon size={28} stroke="var(--g300)" />
          <p>{t("buyer.offers.empty")}</p>
        </div>
      ) : (
        <div className="card-row">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onOpen={() => navigate(`/buyer/offers/${offer.id}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
