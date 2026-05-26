import type { ReactNode } from "react";
import { FlagSVG } from "@/components/icons";
import { OfferImageGallery, type GalleryImage } from "@/components/offer/OfferImageGallery";
import { OfferDestinationPorts } from "@/components/offer/OfferDestinationPorts";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, weightLabel, priceLabel } from "@/lib/units";

/* ──────────────────────────────────────────────────────────
   Shared Offer Detail Layout (supplier & buyer)
   ────────────────────────────────────────────────────────── */

export type OfferItemRow = {
  id: string;
  image?: string | null;
  name: string;
  /** e.g. "Spec 1 · Defatted" */
  subline?: string | null;
  packaging?: string | null;
  qtyKg: number;
  priceKg: number;
  askingKg?: number | null;
  floorKg?: number | null;
};

export type OfferDetailLayoutProps = {
  /* Header */
  offerNumberLabel: string;          // e.g. "M-000023-2026"
  title: string;
  category: string;                  // "Beef", "Pork", ...
  cutCount: number;
  specCount?: number;
  packagingLabel?: string | null;    // first item's packaging shown as chip
  shipmentLabel: string;

  /* Origin / temperature / destinations */
  originCountry: string;
  originCountryCode?: string | null;
  originPort?: string | null;
  condition: string;                 // Frozen / Chilled
  destinations: { name: string; code: string }[];
  destinationPorts: { id: string; name: string; code: string }[];

  /* Totals */
  totalKg: number;
  totalValueUsd: number;
  fclCount: number;
  containerSize: string;

  /* Items table */
  items: OfferItemRow[];
  showSupplierColumns: boolean;      // adds Asking / Floor

  /* Footer */
  paymentTerms?: string | null;
  incoterms: string[];
  createdAt?: string | null;

  /* Media */
  galleryImages: GalleryImage[];
  illustrativeLabel?: string;

  /* Slots */
  topActions?: ReactNode;            // edit/clone/share OR negotiate
  toggle?: ReactNode;                // supplier active toggle
  banners?: ReactNode;               // inactive / negotiation banners
  belowItems?: ReactNode;            // more-info, neg action buttons, etc.
};

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const CATEGORY_DOT: Record<string, string> = {
  Beef: "#DC2626",
  Pork: "#EC4899",
  Poultry: "#F59E0B",
  Lamb: "#7C3AED",
};

export function OfferDetailLayout(props: OfferDetailLayoutProps) {
  const {
    offerNumberLabel,
    title,
    category,
    cutCount,
    specCount,
    packagingLabel,
    shipmentLabel,
    originCountry,
    originCountryCode,
    originPort,
    condition,
    destinations,
    destinationPorts,
    totalKg,
    totalValueUsd,
    fclCount,
    containerSize,
    items,
    showSupplierColumns,
    paymentTerms,
    incoterms,
    createdAt,
    galleryImages,
    illustrativeLabel,
    topActions,
    toggle,
    banners,
    belowItems,
  } = props;

  const { unit } = useWeightUnit();
  const wLbl = weightLabel(unit);
  const pLbl = priceLabel(unit);

  const dot = CATEGORY_DOT[category] ?? "#8B2252";
  const specsCountLabel = specCount ?? cutCount;

  const firstDest = destinations[0];
  const extraDests = destinations.length - 1;
  const visiblePorts = destinationPorts.slice(0, 3);
  const extraPorts = destinationPorts.length - visiblePorts.length;

  return (
    <div className="od2">
      {/* Top action bar */}
      {(toggle || topActions) && (
        <div className="od2-topbar">
          <div>{toggle}</div>
          <div className="od2-topbar-r">{topActions}</div>
        </div>
      )}

      {banners}

      {/* HERO CARD */}
      <section className="od2-hero">
        <div className="od2-hero-img">
          <OfferImageGallery
            images={galleryImages}
            illustrativeLabel={illustrativeLabel}
          />
        </div>

        <div className="od2-hero-center">
          <div className="od2-offer-no">{offerNumberLabel}</div>
          <h1 className="od2-title">{title}</h1>

          <div className="od2-pills">
            <span className="od2-pill">
              <span
                className="od2-pill-dot"
                style={{ background: dot }}
              />
              {category}
            </span>
            <span className="od2-pill od2-pill-muted">
              {specsCountLabel} spec{specsCountLabel === 1 ? "" : "s"} · {cutCount} cut{cutCount === 1 ? "" : "s"}
            </span>
            {packagingLabel && packagingLabel !== "\n" && (
              <span className="od2-pill od2-pill-muted">{packagingLabel}</span>
            )}
          </div>

          <div className="od2-value-label">
            TOTAL VALUE · PER FCL ·
          </div>
          <div className="od2-value">
            <span className="od2-value-cur">US$</span>
            {fmtUsd(totalValueUsd)}
          </div>
          <div className="od2-value-sub">
            {fmtWeight(totalKg, unit)} {wLbl} total weight
            <span className="od2-sep">·</span>
            {fclCount} × {containerSize} FCL
            <span className="od2-sep">·</span>
            Shipment {shipmentLabel}
          </div>
        </div>

        <aside className="od2-hero-sidebar">
          <div className="od2-side-block">
            <div className="od2-side-label">ORIGIN</div>
            <div className="od2-side-value">
              {originCountryCode && <FlagSVG code={originCountryCode} size={14} />}
              <strong>{originCountry}</strong>
            </div>
            {originPort && (
              <div className="od2-side-sub">📍 {originPort}</div>
            )}
          </div>

          <div className="od2-side-block">
            <div className="od2-side-label">TEMPERATURE</div>
            <div className="od2-side-value od2-temp">
              <span aria-hidden>❄</span>
              <strong>{condition}</strong>
            </div>
          </div>

          <div className="od2-side-block">
            <div className="od2-side-label">
              DESTINATION / MARKETS
            </div>
            {firstDest ? (
              <>
                <div className="od2-side-value">
                  <FlagSVG code={firstDest.code} size={14} />
                  <strong>{firstDest.name}</strong>
                  {extraDests > 0 && (
                    <span className="od2-side-extra">+{extraDests}</span>
                  )}
                </div>
                {visiblePorts.length > 0 && (
                  <div className="od2-side-sub">
                    📍 {visiblePorts.map((p) => p.name).join(", ")}
                    {extraPorts > 0 && ` +${extraPorts} more`}
                  </div>
                )}
                {destinationPorts.length > 3 && (
                  <OfferDestinationPorts ports={destinationPorts} />
                )}
              </>
            ) : (
              <div className="od2-side-sub">—</div>
            )}
          </div>
        </aside>
      </section>

      {/* ITEMS TABLE CARD */}
      <section className="od2-items-card">
        <header className="od2-items-header">
          <div className="od2-items-count">
            <strong>{items.length}</strong> item{items.length === 1 ? "" : "s"} in this offer
          </div>
          <div className="od2-items-totals">
            <span>
              Total qty <strong>{fmtWeight(totalKg, unit)} {wLbl}</strong>
            </span>
            <span>
              Total value <strong>US$ {fmtUsd(totalValueUsd * fclCount)}</strong>
            </span>
          </div>
        </header>

        {/* Desktop table */}
        <div className="od2-table-wrap">
          <table className="od2-table">
            <thead>
              <tr>
                <th>PRODUCT / CUT</th>
                <th>PACKING</th>
                <th className="num">QTY PER ITEM</th>
                <th className="num">PRICE / {wLbl.toUpperCase()}</th>
                {showSupplierColumns && (
                  <>
                    <th className="num">ASKING / {wLbl.toUpperCase()}</th>
                    <th className="num">FLOOR / {wLbl.toUpperCase()}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const pkg = it.packaging && it.packaging !== "\n"
                  ? it.packaging
                  : null;
                return (
                  <tr key={it.id}>
                    <td>
                      <div className="od2-cell-cut">
                        <span className="od2-thumb">
                          {it.image ? (
                            <img src={it.image} alt="" />
                          ) : (
                            <span aria-hidden>📷</span>
                          )}
                        </span>
                        <div>
                          <div className="od2-cut-name">{it.name}</div>
                          {it.subline && (
                            <div className="od2-cut-sub">{it.subline}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {pkg ? (
                        <span className="od2-pkg-pill">{pkg}</span>
                      ) : (
                        <span className="od2-muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      {fmtWeight(it.qtyKg, unit)} {wLbl}
                    </td>
                    <td className="num od2-price">
                      US$ {fmtPrice(it.priceKg, unit)}{pLbl.replace("$", "")}
                    </td>
                    {showSupplierColumns && (
                      <>
                        <td className="num">
                          {it.askingKg != null
                            ? `US$ ${fmtPrice(it.askingKg, unit)}${pLbl.replace("$", "")}`
                            : "—"}
                        </td>
                        <td className="num od2-floor">
                          {it.floorKg != null
                            ? `US$ ${fmtPrice(it.floorKg, unit)}${pLbl.replace("$", "")}`
                            : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="od2-items-mobile">
          {items.map((it) => {
            const pkg = it.packaging && it.packaging !== "\n" ? it.packaging : null;
            return (
              <article key={it.id} className="od2-mcard">
                <div className="od2-mcard-h">
                  <span className="od2-thumb">
                    {it.image ? <img src={it.image} alt="" /> : <span aria-hidden>📷</span>}
                  </span>
                  <div className="od2-mcard-name">
                    <div className="od2-cut-name">{it.name}</div>
                    {it.subline && <div className="od2-cut-sub">{it.subline}</div>}
                  </div>
                </div>
                <div className="od2-mcard-grid">
                  <div>
                    <span className="od2-mcard-l">PACKING</span>
                    <span className="od2-mcard-v">{pkg ?? "—"}</span>
                  </div>
                  <div>
                    <span className="od2-mcard-l">QTY</span>
                    <span className="od2-mcard-v">{fmtWeight(it.qtyKg, unit)} {wLbl}</span>
                  </div>
                  <div>
                    <span className="od2-mcard-l">PRICE / {wLbl.toUpperCase()}</span>
                    <span className="od2-mcard-v od2-price">
                      US$ {fmtPrice(it.priceKg, unit)}
                    </span>
                  </div>
                  {showSupplierColumns && (
                    <>
                      <div>
                        <span className="od2-mcard-l">ASKING</span>
                        <span className="od2-mcard-v">
                          {it.askingKg != null ? `US$ ${fmtPrice(it.askingKg, unit)}` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="od2-mcard-l">FLOOR</span>
                        <span className="od2-mcard-v od2-floor">
                          {it.floorKg != null ? `US$ ${fmtPrice(it.floorKg, unit)}` : "—"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <footer className="od2-items-footer">
          <div className="od2-foot-col">
            <div className="od2-foot-l">PAYMENT TERMS</div>
            <div className="od2-foot-v">{paymentTerms || "—"}</div>
          </div>
          <div className="od2-foot-col">
            <div className="od2-foot-l">INCOTERMS</div>
            <div className="od2-foot-v">
              {incoterms.length > 0 ? (
                <span className="od2-inco-row">
                  {incoterms.map((i) => (
                    <span key={i} className="od2-inco-pill">{i}</span>
                  ))}
                </span>
              ) : "—"}
            </div>
          </div>
          <div className="od2-foot-col">
            <div className="od2-foot-l">CONTAINER</div>
            <div className="od2-foot-v">{fclCount} × {containerSize}</div>
          </div>
          <div className="od2-foot-col">
            <div className="od2-foot-l">CREATED</div>
            <div className="od2-foot-v">
              {createdAt
                ? new Date(createdAt).toLocaleDateString()
                : "—"}
            </div>
          </div>
        </footer>
      </section>

      {belowItems}
    </div>
  );
}