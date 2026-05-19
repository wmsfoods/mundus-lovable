import { useNavigate, useParams } from "react-router-dom";
import {
  TagIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  MapPinIcon,
  FlagSVG,
} from "@/components/icons";
import { useOffer, type OfferDetailed } from "@/hooks/useOffer";
import { useState } from "react";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COUNTRY_CODE_MAP: Record<string, string> = {
  argentina: "AR", australia: "AU", brazil: "BR", canada: "CA", chile: "CL",
  china: "CN", egypt: "EG", france: "FR", germany: "DE", "hong kong": "HK",
  india: "IN", italy: "IT", japan: "JP", jordan: "JO", mexico: "MX",
  netherlands: "NL", paraguay: "PY", poland: "PL", "saudi arabia": "SA",
  "south africa": "ZA", "south korea": "KR", spain: "ES", turkey: "TR",
  "united arab emirates": "AE", uae: "AE", "united kingdom": "GB", uk: "GB",
  "united states": "US", "united states of america": "US", usa: "US", us: "US",
  uruguay: "UY", vietnam: "VN",
};
function countryToCode(name: string | null | undefined): string {
  if (!name) return "";
  return COUNTRY_CODE_MAP[name.trim().toLowerCase()] ?? "";
}
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
function marblingLabel(code: number | null | undefined): string {
  if (code == null) return "Not Classified";
  const labels: Record<number, string> = {
    0: "Not Classified", 1: "Low", 2: "Medium", 3: "High", 4: "Premium",
  };
  return labels[code] ?? "Not Classified";
}

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  active:      { bg: "#e6f7ed", fg: "#15803d", dot: "#16a34a", label: "Available" },
  new:         { bg: "#fff4e0", fg: "#a85b00", dot: "#f59e0b", label: "New" },
  negotiating: { bg: "#fef0f0", fg: "#b6354b", dot: "#d65370", label: "In negotiation" },
  closed:      { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af", label: "Closed" },
};
function statusFor(s: string | null) {
  if (!s) return STATUS_COLORS.active;
  return STATUS_COLORS[s.toLowerCase()] ?? STATUS_COLORS.active;
}

export default function BuyerOfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { offer, loading, error, notFound } = useOffer(id);
  const [moreOpen, setMoreOpen] = useState(false);

  if (loading) {
    return (
      <>
        <CrumbsHeader title="Loading…" navigate={navigate} />
        <div className="offers-loading">Loading offer…</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <CrumbsHeader title="Error" navigate={navigate} />
        <div className="offers-error">Couldn't load this offer: {error}</div>
      </>
    );
  }

  if (notFound || !offer) {
    return (
      <>
        <CrumbsHeader title="Offer not found" navigate={navigate} />
        <div className="empty-state">
          <p>This offer doesn't exist or is no longer available.</p>
          <button className="btn-back" onClick={() => navigate("/buyer/offers")}>
            <ArrowLeftIcon size={14} /> Back to offers
          </button>
        </div>
      </>
    );
  }

  return <OfferDetailContent offer={offer} navigate={navigate} moreOpen={moreOpen} setMoreOpen={setMoreOpen} />;
}

function CrumbsHeader({ title, navigate }: { title: string; navigate: (path: string) => void }) {
  return (
    <div className="crumbs">
      <a onClick={(e) => { e.preventDefault(); navigate("/buyer"); }} href="/buyer">Home</a>
      <span className="sep">›</span>
      <a onClick={(e) => { e.preventDefault(); navigate("/buyer/offers"); }} href="/buyer/offers">Offers</a>
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
}: {
  offer: OfferDetailed;
  navigate: (path: string) => void;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
}) {
  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];

  const title = mixed
    ? `Mixed (${items.length} cuts)`
    : firstItem?.customer_product?.name ?? "Offer";

  const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);

  const grossValue = items.reduce(
    (s, it) => s + Number(it.price ?? 0) * Number(it.amount ?? 0),
    0
  );
  const fclCount = offer.total_fcl ?? 1;
  const totalValuePerFcl = grossValue / Math.max(1, fclCount);

  const originCode = countryToCode(offer.origin_country);

  const destinations = (offer.markets ?? [])
    .map((m) => m.market?.country?.english_name)
    .filter((x): x is string => !!x);
  const firstDest = destinations[0] ?? null;
  const destCode = countryToCode(firstDest);

  const marbling =
    firstItem?.customer_product?.beef_marbling != null
      ? marblingLabel(firstItem.customer_product.beef_marbling)
      : "Not Classified";

  const condition = firstItem?.condition ?? "—";

  const incotermLabels = (offer.incoterms ?? []).map((i) => i.incoterm_type);

  const status = statusFor(offer.status);

  return (
    <>
      <div className="crumbs">
        <a onClick={(e) => { e.preventDefault(); navigate("/buyer"); }} href="/buyer">Home</a>
        <span className="sep">›</span>
        <a onClick={(e) => { e.preventDefault(); navigate("/buyer/offers"); }} href="/buyer/offers">Offers</a>
        <span className="sep">›</span>
        <b>{title}</b>
      </div>

      <div className="od-grid">
        <div className="od-gallery">
          <div className="od-gallery-main">
            <div className="od-gallery-placeholder">
              <span className="od-illu-label">ILLUSTRATIVE IMAGE</span>
            </div>
          </div>
          <div className="od-gallery-thumbs">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="od-thumb" />
            ))}
          </div>
        </div>

        <div className="od-right">
          <div className="od-title-row">
            <span className="oc-chip">
              <TagIcon size={18} />
            </span>
            <div className="od-title-block">
              <h1 className="od-title">{title}</h1>
              <div className="od-subtitle">
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
              {status.label}
            </span>
          </div>

          <div className="od-price-block">
            <div className="od-price-amount">US$ {formatPrice(totalValuePerFcl)}</div>
            <div className="od-price-caption">
              Total Value (Starting price) per FCL
            </div>
          </div>

          <div className="od-cuts">
            <div className="od-cuts-head">
              <span>CUT</span>
              <span>MARBLING</span>
              <span className="num">QTY PER CUT</span>
              <span className="num">PRICE PER KG</span>
            </div>
            {items.map((it) => (
              <div key={it.id} className="od-cuts-row">
                <span>{it.customer_product?.name ?? "—"}</span>
                <span>{marblingLabel(it.customer_product?.beef_marbling)}</span>
                <span className="num">{formatNumber(Number(it.amount))} kg</span>
                <span className="num">US$ {formatPrice(Number(it.price))}/kg</span>
              </div>
            ))}
          </div>

          <div className="od-total-weight">
            <span className="amt">{formatNumber(totalKg)} kg</span>
            <span className="lbl">Total weight</span>
          </div>

          <div className="od-meta-row">
            <div className="od-meta-item">
              <span className="od-meta-label">Marbling</span>
              <span className="od-meta-value">{marbling}</span>
            </div>
            <div className="od-meta-item">
              <span className="od-meta-label">Origin (port / country)</span>
              <span className="od-meta-value">
                <MapPinIcon size={13} />
                {offer.origin_port} / {offer.origin_country}
                {originCode && <FlagSVG code={originCode} size={13} />}
              </span>
            </div>
            <div className="od-meta-item">
              <span className="od-meta-label">Condition</span>
              <span className="od-meta-value">{condition}</span>
            </div>
            {firstDest && (
              <div className="od-meta-item">
                <span className="od-meta-label">
                  Destination{destinations.length > 1 ? ` (+${destinations.length - 1})` : ""}
                </span>
                <span className="od-meta-value">
                  {destCode && <FlagSVG code={destCode} size={13} />}
                  {firstDest}
                </span>
              </div>
            )}
          </div>

          <div className="od-terms">
            <div className="od-terms-label">Terms</div>
            <div className="od-terms-value">{offer.payment_terms}</div>
          </div>

          <div className="od-fcl-row">
            <span className="od-fcl-count">
              {offer.total_fcl ?? 1} Available FCL{(offer.total_fcl ?? 1) === 1 ? "" : "s"}
            </span>
            <span className="od-fcl-size">Size: {offer.container_size}</span>
            {incotermLabels.length > 0 && (
              <span className="od-fcl-incoterms">
                {incotermLabels.map((i) => (
                  <span key={i} className="od-incoterm-pill">{i}</span>
                ))}
              </span>
            )}
          </div>

          <div className="od-shipment-row">
            <span className="od-meta-label">Shipment</span>
            <span className="od-meta-value">
              {formatShipment(offer.shipment_month, offer.shipment_year)}
            </span>
          </div>

          <button
            className="od-more-toggle"
            onClick={() => setMoreOpen(!moreOpen)}
            type="button"
          >
            <span>More information</span>
            <ChevronDownIcon
              size={14}
              style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
            />
          </button>
          {moreOpen && (
            <div className="od-more-content">
              {offer.observation ? offer.observation : "Nothing to display here."}
            </div>
          )}

          <div className="od-actions">
            <button
              type="button"
              className="btn-od btn-od-outline"
              onClick={() => alert("Negotiate flow — coming soon")}
            >
              Negotiate
            </button>
            <button
              type="button"
              className="btn-od btn-od-primary"
              onClick={() => alert("Place order flow — coming soon")}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
