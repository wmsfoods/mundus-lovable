import { useState, useRef, useEffect } from "react";
import { FlagSVG } from "@/components/icons";
import type { GalleryImage } from "@/components/offer/OfferImageGallery";
import { fmtWeight, fmtPrice, weightLabel, type WeightUnit } from "@/lib/units";
import { countryToCode } from "@/lib/countryCodes";
import "@/styles/mundus-offer-card-tooltip.css";

function formatUsdInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export type OfferCardItem = {
  id: string;
  name: string;
  specLabel?: string | null;
  packing?: string | null;
  qtyKg: number;
  pricePerKgUsd: number;
  askingPerKgUsd?: number | null;
  floorPerKgUsd?: number | null;
  imageSrc?: string | null;
  /** When set, the cell shows a secondary "Final" price line under the base. */
  adjustedPricePerKgUsd?: number | null;
  /** Short label for the adjusted line, e.g. "CIF · Buenos Aires" or "FOB". */
  adjustedLabel?: string | null;
};

export type OfferCardsProps = {
  offerNumber: string;
  title: string;
  category?: string | null;
  condition?: string | null;
  totalValueUsd: number;
  totalQtyKg: number;
  containerLabel: string;
  shipmentLabel: string;
  origin: {
    country: string | null;
    port?: string | null;
    code?: string | null;
    extraCount?: number;
    allPorts?: string[];
  };
  destination: {
    country: string | null;
    port?: string | null;
    code?: string | null;
    extraCount?: number;
    allCountries?: string[];
  };
  incoterms: string[];
  paymentTerms?: string | null;
  containerSize?: string | null;
  containerCount?: number | null;
  destinationPortsCount?: number;
  createdAt?: string | null;
  supplierName?: string | null;
  items: OfferCardItem[];
  showSupplierPricing?: boolean;
  gallery: GalleryImage[];
  illustrativeLabel?: string;
  unit: WeightUnit;
  statusPill?: React.ReactNode;
};

export function OfferDetailCards(props: OfferCardsProps) {
  const {
    offerNumber, title, category, condition,
    totalValueUsd, totalQtyKg, containerLabel, shipmentLabel,
    origin, destination, incoterms, paymentTerms,
    containerSize, containerCount, destinationPortsCount, createdAt,
    supplierName,
    items, showSupplierPricing, gallery, illustrativeLabel, unit, statusPill,
  } = props;

  const wLbl = weightLabel(unit);
  const specsCount = items.length;
  const cutsCount = items.length;
  const avgPricePerUnit = totalQtyKg > 0 ? totalValueUsd / totalQtyKg : 0;

  return (
    <div className="ofc-stack">
      {/* ── Header card ── */}
      <div className="ofc-card ofc-header">
        <OfferThumb
          gallery={gallery}
          illustrativeLabel={illustrativeLabel}
        />

        <div className="ofc-header-main">
          <div className="ofc-offer-number">{offerNumber}</div>
          <h1 className="ofc-title">{title}</h1>
          {supplierName && (
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginTop: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🏭 {supplierName}
            </div>
          )}
          <div className="ofc-chip-row">
            {category && (
              <span className="ofc-chip ofc-chip-protein">● {category}</span>
            )}
            {condition && (
              <span className="ofc-chip ofc-chip-condition">❄ {condition}</span>
            )}
            <span className="ofc-chip ofc-chip-count">
              {specsCount} {specsCount === 1 ? "spec" : "specs"} · {cutsCount} {cutsCount === 1 ? "cut" : "cuts"}
            </span>
            {statusPill}
          </div>
        </div>

        <div className="ofc-header-aside">
          <span className="ofc-aside-label">Total value · per FCL</span>
          <span className="ofc-aside-value">
            <span className="ofc-currency">US$</span>
            {formatUsdInt(totalValueUsd)}
          </span>
          <span className="ofc-aside-sub">
            {fmtWeight(totalQtyKg, unit)} {wLbl} total · {containerLabel} · Shipment {shipmentLabel}
          </span>
        </div>
      </div>

      {/* ── Route card ── */}
      <div className="ofc-card ofc-route">
        <div className="ofc-route-side">
          <div className="ofc-route-flag">
            {origin.code ? <FlagSVG code={origin.code} size={36} /> : null}
          </div>
          <div className="ofc-route-place">
            <div className="ofc-route-label">Origin</div>
            <div className="ofc-route-country">{origin.country || "—"}</div>
            {origin.port && (
              <div className="ofc-route-port">
                {origin.extraCount && origin.allPorts && origin.allPorts.length > 1 ? (
                  <span className="dest-hover-wrap">
                    {origin.port}
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginLeft: 4 }}>
                      +{origin.extraCount}
                    </span>
                    <div className="dest-tooltip">
                      <div className="dest-tooltip-title">All origin ports:</div>
                      {origin.allPorts.map((n, i) => (
                        <div key={i} className="dest-tooltip-row">📍 {n}</div>
                      ))}
                    </div>
                  </span>
                ) : (
                  origin.port
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ofc-route-middle">
          <div className="ofc-route-pills">
            {condition && <span className="ofc-route-pill">❄ {condition}</span>}
            {containerLabel && <span className="ofc-route-pill neutral">📦 {containerLabel}</span>}
          </div>
          <div className="ofc-route-line" />
        </div>

        <div className="ofc-route-side right">
          <div className="ofc-route-place">
            <div className="ofc-route-label">Destination</div>
            <div className="ofc-route-country">
              {destination.extraCount && destination.allCountries && destination.allCountries.length > 1 ? (
                <span className="dest-hover-wrap">
                  {destination.country || "—"}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", marginLeft: 6 }}>
                    +{destination.extraCount}
                  </span>
                  <div className="dest-tooltip">
                    <div className="dest-tooltip-title">Available destinations:</div>
                    {destination.allCountries.map((n, i) => (
                      <div key={i} className="dest-tooltip-row">
                        <FlagSVG code={countryToCode(n)} size={12} /> {n}
                      </div>
                    ))}
                  </div>
                </span>
              ) : (
                <>{destination.country || "—"}</>
              )}
            </div>
            {destination.port && <div className="ofc-route-port">{destination.port}</div>}
          </div>
          <div className="ofc-route-flag">
            {destination.code ? <FlagSVG code={destination.code} size={36} /> : null}
          </div>
        </div>
      </div>

      {/* ── Items card ── */}
      <div className="ofc-card">
        <div className="ofc-items-head">
          <div className="ofc-items-title">
            Items in this offer <span className="muted">· {items.length}</span>
          </div>
          <div className="ofc-items-stats">
            <span>Total qty <b>{fmtWeight(totalQtyKg, unit)} {wLbl}</b></span>
            <span>Avg <b>US$ {fmtPrice(avgPricePerUnit, unit)}/{wLbl}</b></span>
            <span>Total value <b>US$ {formatUsdInt(totalValueUsd)}</b></span>
          </div>
        </div>

        <div className="ofc-items-table-wrap">
          <div className="ofc-items-scroll">
            <table className="ofc-items-table">
              <thead>
                <tr>
                  <th>Product / Cut</th>
                  <th>Packing</th>
                  <th className="num">Qty per item</th>
                  <th className="num">Price / {wLbl}</th>
                  {showSupplierPricing && <th className="num">Asking / {wLbl}</th>}
                  {showSupplierPricing && <th className="num">Floor / {wLbl}</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="ofc-item-cell">
                        {it.imageSrc ? (
                          <img src={it.imageSrc} alt={it.name} className="ofc-item-img" />
                        ) : (
                          <div className="ofc-item-img placeholder" aria-hidden />
                        )}
                        <div>
                          <div className="ofc-item-name">{it.name}</div>
                          {it.specLabel && <div className="ofc-item-sub">{it.specLabel}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{it.packing && it.packing !== "\n" ? it.packing : "—"}</td>
                    <td className="num">{fmtWeight(it.qtyKg, unit)} {wLbl}</td>
                    <td className="num">
                      <span className="ofc-price-main">US$ {fmtPrice(it.pricePerKgUsd, unit)}</span>
                      <span className="ofc-price-unit">/{wLbl}</span>
                      {it.adjustedPricePerKgUsd != null && it.adjustedPricePerKgUsd > 0 && (
                        <div style={{ fontSize: 10, marginTop: 2, color: it.adjustedPricePerKgUsd >= it.pricePerKgUsd ? "#15803d" : "#b91c1c" }}>
                          → US$ {fmtPrice(it.adjustedPricePerKgUsd, unit)}/{wLbl}
                          {it.adjustedLabel ? <span style={{ color: "#6b7280" }}> · {it.adjustedLabel}</span> : null}
                        </div>
                      )}
                    </td>
                    {showSupplierPricing && (
                      <td className="num ofc-secondary-price">
                        US$ {fmtPrice(it.askingPerKgUsd ?? it.pricePerKgUsd * 1.05, unit)}
                        <span className="ofc-price-unit">/{wLbl}</span>
                      </td>
                    )}
                    {showSupplierPricing && (
                      <td className="num ofc-secondary-price">
                        US$ {fmtPrice(it.floorPerKgUsd ?? it.pricePerKgUsd * 0.9, unit)}
                        <span className="ofc-price-unit">/{wLbl}</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ofc-items-foot">
            <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
            <span className="qty">{fmtWeight(totalQtyKg, unit)} {wLbl}</span>
            <span className="total">US$ {formatUsdInt(totalValueUsd)}</span>
          </div>
        </div>

        {/* Mobile list */}
        <div className="ofc-items-mobile">
          {items.map((it) => (
            <div key={it.id} className="ofc-items-mobile-row">
              {it.imageSrc ? (
                <img src={it.imageSrc} alt={it.name} className="ofc-item-img" />
              ) : (
                <div className="ofc-item-img placeholder" aria-hidden />
              )}
              <div className="ofc-mob-main">
                <div className="ofc-item-name">{it.name}</div>
                <div className="ofc-mob-meta">
                  <span>{fmtWeight(it.qtyKg, unit)} {wLbl}</span>
                  {it.packing && it.packing !== "\n" && <span>{it.packing}</span>}
                  {it.specLabel && <span>{it.specLabel}</span>}
                </div>
              </div>
              <div className="ofc-mob-right">
                <div className="ofc-price-main">US$ {fmtPrice(it.pricePerKgUsd, unit)}/{wLbl}</div>
                {showSupplierPricing && (
                  <div style={{ color: "#6b7280", fontSize: 11 }}>
                    Ask {fmtPrice(it.askingPerKgUsd ?? it.pricePerKgUsd * 1.05, unit)} ·
                    Floor {fmtPrice(it.floorPerKgUsd ?? it.pricePerKgUsd * 0.9, unit)}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="ofc-items-foot" style={{ border: 0, marginTop: 0 }}>
            <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
            <span className="total">US$ {formatUsdInt(totalValueUsd)}</span>
          </div>
        </div>
      </div>

      {/* ── Meta card ── */}
      <div className="ofc-card ofc-meta">
        <div className="ofc-meta-cell">
          <div className="ofc-meta-label">Incoterms</div>
          {incoterms.length > 0 ? (
            <div className="ofc-incoterm-pills">
              {incoterms.map((i) => (
                <span key={i} className="ofc-incoterm">{i}</span>
              ))}
            </div>
          ) : (
            <div className="ofc-meta-value">—</div>
          )}
        </div>
        <div className="ofc-meta-cell">
          <div className="ofc-meta-label">Payment terms</div>
          <div className="ofc-meta-value">{paymentTerms || "—"}</div>
        </div>
        <div className="ofc-meta-cell">
          <div className="ofc-meta-label">Container</div>
          <div className="ofc-meta-value">
            {containerCount ?? 1} × {containerSize || "—"}
            {destinationPortsCount && destinationPortsCount > 0 ? (
              <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 12 }}>
                {" · "}{destinationPortsCount} {destinationPortsCount === 1 ? "destination port" : "destination ports"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="ofc-meta-cell">
          <div className="ofc-meta-label">Created</div>
          <div className="ofc-meta-value">
            {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Thumb with strip + lightbox ── */
function OfferThumb({
  gallery,
  illustrativeLabel,
}: {
  gallery: GalleryImage[];
  illustrativeLabel?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    if (gallery.length < 2) return;
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    timer.current = window.setInterval(() => {
      if (paused.current) return;
      setIdx((i) => (i + 1) % gallery.length);
    }, 3500);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [gallery.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : Math.min(gallery.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, gallery.length]);

  const current = gallery[idx];

  return (
    <div className="ofc-header-thumb">
      <div
        className="ofc-thumb-main"
        onClick={() => current && setLightbox(idx)}
        onMouseEnter={() => { paused.current = true; }}
        onMouseLeave={() => { paused.current = false; }}
        role={current ? "button" : undefined}
        aria-label={current ? `Open ${current.label}` : undefined}
      >
        {gallery.length === 0 && (
          <span style={{ color: "#9ca3af", fontSize: 11 }}>No image</span>
        )}
        {gallery.map((g, i) => (
          <img
            key={g.id}
            src={g.src}
            alt={g.label}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              opacity: i === idx ? 1 : 0,
              transition: "opacity 350ms ease",
              pointerEvents: "none",
            }}
          />
        ))}
        {illustrativeLabel && <span className="ofc-illu-tag">{illustrativeLabel}</span>}
      </div>
      {gallery.length > 1 && (
        <div className="ofc-thumb-strip">
          {gallery.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className={`ofc-mini ${i === idx ? "on" : ""}`}
              onClick={() => { paused.current = true; setIdx(i); }}
              aria-label={`Show ${g.label}`}
            >
              <img src={g.src} alt={g.label} />
            </button>
          ))}
        </div>
      )}

      {lightbox !== null && gallery[lightbox] && (
        <div className="od-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button
            type="button"
            className="od-lightbox-close"
            aria-label="Close"
            onClick={() => setLightbox(null)}
          >×</button>
          {gallery.length > 1 && (
            <button
              type="button"
              className="od-lightbox-nav prev"
              aria-label="Previous"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : Math.max(0, i - 1))); }}
              disabled={lightbox === 0}
            >‹</button>
          )}
          <figure className="od-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img src={gallery[lightbox].src} alt={gallery[lightbox].label} />
            <figcaption>{gallery[lightbox].label}</figcaption>
          </figure>
          {gallery.length > 1 && (
            <button
              type="button"
              className="od-lightbox-nav next"
              aria-label="Next"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : Math.min(gallery.length - 1, i + 1))); }}
              disabled={lightbox === gallery.length - 1}
            >›</button>
          )}
        </div>
      )}
    </div>
  );
}