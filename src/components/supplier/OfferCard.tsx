import {
  KnifeForkIcon,
  ArrowRightIcon,
  GridIcon,
  FlagSVG,
  EyeIcon,
  MessageIcon,
  ClockIcon,
} from "@/components/icons";
import type { SupplierOffer } from "@/data/mockSupplierOffers";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useCutImages, CutThumb } from "@/hooks/useCutImages";

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  active:      { bg: "#e6f7ed", fg: "#15803d", dot: "#16a34a" },
  new:         { bg: "#fff4e0", fg: "#a85b00", dot: "#f59e0b" },
  negotiating: { bg: "#fef0f0", fg: "#b6354b", dot: "#d65370" },
  closed:      { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
  inactive:    { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
  sold_out:    { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
};

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
function derive(o: SupplierOffer) {
  const h = hashId(o.id);
  return {
    views: (h % 200) + 30,
    proposals: h % 7,
    daysLeft: (h % 45) + 1,
    volumeMt: Math.round(o.totalKg / 1000),
  };
}

export function SupplierOfferCard({
  o,
  onOpen,
  t,
  negInfo,
}: {
  o: SupplierOffer;
  onOpen: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  negInfo?: { total: number; companies: number };
}) {
  const status = STATUS_COLORS[o.status] ?? STATUS_COLORS.active;
  const firstDest = o.destinations[0];
  const extraDest = Math.max(0, o.destinations.length - 1);
  const destLabel = firstDest
    ? extraDest > 0 ? `${firstDest.name} +${extraDest}` : firstDest.name
    : "—";
  const firstIncoterm = o.incoterms[0] ?? "—";
  const visibleCuts = o.items.slice(0, 3);
  const moreCuts = Math.max(0, o.items.length - visibleCuts.length);
  const d = derive(o);
  const cutImgs = useCutImages(o.items.map((it) => it.name));

  return (
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
          {o.mixed && (
            <span className="mixed-badge cuts-badge-strong">
              <GridIcon size={9} /> {t("supplier.offers.card.cuts", { count: o.items.length })}
            </span>
          )}
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
        </div>
      </div>

      <div className="oc-title-block">
        <div className="oc-title">{o.title}</div>
        {o.mixed ? (
          <div className="cut-chips">
            {visibleCuts.map((it) => (
              <span key={it.name} className="cut-chip" style={{ display: "inline-flex", alignItems: "center" }}>
                <CutThumb src={cutImgs[it.name]} size={20} />
                {it.name}
              </span>
            ))}
            {moreCuts > 0 && (
              <span className="cut-chip is-more">{t("supplier.offers.card.moreCuts", { count: moreCuts })}</span>
            )}
          </div>
        ) : (
          <div className="oc-cut-text" style={{ display: "inline-flex", alignItems: "center" }}>
            <CutThumb src={cutImgs[o.items[0]?.name ?? ""]} size={20} />
            {o.cutsLabel}
          </div>
        )}
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.destination")}</span>
          <span className="cm-value">
            {firstDest && <FlagSVG code={firstDest.code} size={13} />}
            {destLabel}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.incoterm")}</span>
          <span className="cm-value">{firstIncoterm}</span>
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
        <span className={d.daysLeft <= 7 ? "is-warn" : ""}><ClockIcon size={12} /> {t("supplier.offers.card.daysLeft", { n: d.daysLeft })}</span>
      </div>

      <div className="oc-footer">
        <div className="oc-qty-l">
          <span className="cur">QTY</span>
          <span className="amt">{d.volumeMt} <small>MT</small></span>
        </div>
        <button type="button" className="oc-open-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          {t("supplier.offers.openOffer")} <ArrowRightIcon size={12} />
        </button>
      </div>
    </article>
  );
}