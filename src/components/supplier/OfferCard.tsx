import {
  KnifeForkIcon,
  ArrowRightIcon,
  GridIcon,
  FlagSVG,
  EyeIcon,
  MessageIcon,
} from "@/components/icons";
import { Trash2 } from "lucide-react";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { formatOfferNumber } from "@/lib/offerNumber";
import { formatIncotermWithPlace } from "@/lib/incotermPricing";
import { useCutImages, CutThumb } from "@/hooks/useCutImages";
import "@/styles/mundus-offer-card-tooltip.css";
import { GlowCard } from "@/components/ui/spotlight-card";
import type { SocialCounts } from "@/hooks/useOfferSocial";
import { OfferSocialBar } from "@/components/offers/OfferSocialBar";

function FobBadge({ t }: { t: (k: string, opts?: Record<string, unknown>) => string }) {
  return (
    <span
      title={t("buyer.offerDetail.freightCalc.fobAvailableTooltip", {
        defaultValue: "Supplier offers FOB pricing for this offer",
      })}
      style={{
        padding: "2px 8px",
        borderRadius: 10,
        background: "#eef2ff",
        color: "#3730a3",
        border: "1px solid #c7d2fe",
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      ⚓ {t("buyer.offerDetail.freightCalc.fobAvailable", { defaultValue: "FOB Available" })}
    </span>
  );
}

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  active:      { bg: "#e6f7ed", fg: "#15803d", dot: "#16a34a" },
  new:         { bg: "#fff4e0", fg: "#a85b00", dot: "#f59e0b" },
  negotiating: { bg: "#fef0f0", fg: "#b6354b", dot: "#d65370" },
  closed:      { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
  inactive:    { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
  sold_out:    { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
  draft:       { bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" },
};

function derive(o: SupplierOffer) {
  return {
    views: o.viewCount ?? 0,
    proposals: o.proposalCount ?? 0,
    volumeMt: Math.round(o.totalKg / 1000),
  };
}

export function SupplierOfferCard({
  o,
  onOpen,
  t,
  negInfo,
  onDelete,
  social,
}: {
  o: SupplierOffer;
  onOpen: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  negInfo?: { total: number; companies: number };
  onDelete?: (o: SupplierOffer) => void;
  social?: SocialCounts;
}) {
  const status = STATUS_COLORS[o.status] ?? STATUS_COLORS.active;
  const firstDest = o.destinations[0];
  const extraDest = Math.max(0, o.destinations.length - 1);
  const destLabel = firstDest
    ? extraDest > 0 ? `${firstDest.name} +${extraDest}` : firstDest.name
    : "—";
  const firstIncoterm = o.incoterms[0] ?? "—";
  const extraIncoterms = Math.max(0, o.incoterms.length - 1);
  const destNames = o.destinations.map((d) => d.name);
  const fmtIc = (ic: string) =>
    formatIncotermWithPlace(ic, {
      originPort: o.originPort,
      destinationNames: destNames,
    });
  const incotermLabel = extraIncoterms > 0
    ? `${firstIncoterm} +${extraIncoterms}`
    : fmtIc(firstIncoterm);
  const firstCut = o.items[0];
  const moreCuts = Math.max(0, o.items.length - 1);
  const d = derive(o);
  const cutImgs = useCutImages(o.items.map((it) => it.name));
  const titleText = o.items.length > 1
    ? t("supplier.offers.card.mixedTitle", { count: o.items.length, defaultValue: `Mixed Container — ${o.items.length} cuts` })
    : t("supplier.offers.card.fullContainerOneCut", { defaultValue: "Full Container — 1 Cut" });

  return (
    <GlowCard glowColor="mundus" radius={14}>
    <article
      className="oc"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      style={o.status === "sold_out" ? { opacity: 0.75 } : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
    >
      <div className="oc-head">
        <div className="oc-head-l">
          <span className="oc-chip"><KnifeForkIcon size={14} /></span>
          <span className="oc-cat">{o.category}</span>
          <span className="dot-sep" />
          <span className="oc-temp">{o.condition}</span>
          <span className="dot-sep" />
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {formatOfferNumber(o.offerNumber, o.createdAt)}
          </span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {o.status === "sold_out" ? (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 10,
                background: "#dcfce7",
                color: "#166534",
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              ✅ Sold Out
            </span>
          ) : (
            <span className="status-pill" style={{ background: status.bg, color: status.fg }}>
              <span className="status-dot" style={{ background: status.dot }} />
              {t(`supplier.offers.status.${o.status}`)}
            </span>
          )}
          {negInfo && negInfo.total > 0 ? (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 10,
                background: "#fef3c7",
                color: "#92400e",
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              🤝 {negInfo.total} negotiation{negInfo.total > 1 ? "s" : ""}
              {negInfo.companies > 0 && (
                <> · {negInfo.companies} {negInfo.companies > 1 ? "buyers" : "buyer"}</>
              )}
            </span>
          ) : null}
          {o.hasFob && <FobBadge t={t} />}
        </div>
      </div>

      {o.originCountry && (
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
            {t("supplier.offers.card.origin")}:
          </span>
          {o.originCountryCode && <FlagSVG code={o.originCountryCode} size={13} />}
          {o.originCountry}
        </div>
      )}

      <div className="oc-title-block">
        <div className="oc-title">{titleText}</div>
        <div className="cut-chips">
          {firstCut && (
            <span className="cut-chip" style={{ display: "inline-flex", alignItems: "center" }}>
              <CutThumb src={cutImgs[firstCut.name]} size={20} />
              {firstCut.name}
            </span>
          )}
          {moreCuts > 0 && (
            <button
              type="button"
              className="cut-chip is-more"
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              style={{ cursor: "pointer", border: "none" }}
              title={t("supplier.offers.card.moreCuts", { count: moreCuts })}
            >
              +{moreCuts}
            </button>
          )}
        </div>
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.destination")}</span>
          <span className="cm-value dest-hover-wrap">
            {firstDest && <FlagSVG code={firstDest.code} size={13} />}
            {destLabel}
            {o.destinations.length > 1 && (
              <div className="dest-tooltip">
                <div className="dest-tooltip-title">Available destinations:</div>
                {o.destinations.map((d, i) => (
                  <div key={i} className="dest-tooltip-row">
                    <FlagSVG code={d.code} size={12} /> {d.name}
                  </div>
                ))}
              </div>
            )}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.incoterm")}</span>
          <span className="cm-value dest-hover-wrap">
            {incotermLabel}
            {extraIncoterms > 0 && (
              <div className="dest-tooltip">
                <div className="dest-tooltip-title">Available incoterms:</div>
                {o.incoterms.map((inc, i) => (
                  <div key={i} className="dest-tooltip-row">{fmtIc(inc)}</div>
                ))}
              </div>
            )}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.shipment")}</span>
          <span className="cm-value">{o.shipmentLabel}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.volume")}</span>
          <span className="cm-value">{d.volumeMt} MT</span>
        </div>
      </div>

      <div className="oc-stats">
        <span><EyeIcon size={12} /> <strong>{d.views}</strong> {t("supplier.offers.card.views")}</span>
        <span><MessageIcon size={12} /> <strong>{d.proposals}</strong> {t("supplier.offers.card.proposals")}</span>
      </div>

      <div className="oc-footer">
        <div className="oc-qty-l">
          <span className="cur">QTY</span>
          <span className="amt">{d.volumeMt} <small>MT</small></span>
        </div>
        <button type="button" className="oc-open-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          {t("supplier.offers.openOffer")} <ArrowRightIcon size={12} />
        </button>
        {o.status === "draft" && onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(o); }}
            title={t("supplier.offers.deleteDraft")}
            aria-label={t("supplier.offers.deleteDraft")}
            style={{
              marginLeft: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fff",
              color: "#b91c1c",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} /> {t("supplier.offers.deleteDraft")}
          </button>
        )}
      </div>
      {social && (
        <div style={{ borderTop: "1px solid #f1f1f3", padding: "8px 12px", marginTop: 4 }}>
          <OfferSocialBar
            offerId={o.id}
            counts={social}
            readOnly
            shareUrl={`${window.location.origin}/s/offer/${o.id}`}
            shareTitle="Mundus Offer"
          />
        </div>
      )}
    </article>
    </GlowCard>
  );
}