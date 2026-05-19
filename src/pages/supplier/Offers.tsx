import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  TagIcon,
  KnifeForkIcon,
  ArrowRightIcon,
  GridIcon,
  PlusIcon,
  FlagSVG,
} from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { MOCK_SUPPLIER_OFFERS, PAGE_SIZE, type SupplierOffer } from "@/data/mockSupplierOffers";

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  active:      { bg: "#e6f7ed", fg: "#15803d", dot: "#16a34a" },
  new:         { bg: "#fff4e0", fg: "#a85b00", dot: "#f59e0b" },
  negotiating: { bg: "#fef0f0", fg: "#b6354b", dot: "#d65370" },
  closed:      { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
  inactive:    { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
};

function formatPrice(n: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function SupplierOfferCard({ o, onOpen, t }: { o: SupplierOffer; onOpen: () => void; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const status = STATUS_COLORS[o.status] ?? STATUS_COLORS.active;
  const firstDest = o.destinations[0];
  const extraDest = Math.max(0, o.destinations.length - 1);
  const destLabel = firstDest
    ? extraDest > 0 ? `${firstDest.name} +${extraDest}` : firstDest.name
    : "—";
  const firstIncoterm = o.incoterms[0] ?? "—";
  const extraIncoterms = Math.max(0, o.incoterms.length - 1);
  const incotermLabel = extraIncoterms > 0 ? `${firstIncoterm} +${extraIncoterms}` : `${firstIncoterm} ${o.originPort}`;
  const visibleCuts = o.items.slice(0, 3);
  const moreCuts = Math.max(0, o.items.length - visibleCuts.length);

  return (
    <article
      className="oc"
      role="button"
      tabIndex={0}
      onClick={onOpen}
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
          {o.mixed && (
            <span className="mixed-badge">
              <GridIcon size={9} /> {t("supplier.offers.card.cuts", { count: o.items.length })}
            </span>
          )}
        </div>
        <span className="status-pill" style={{ background: status.bg, color: status.fg }}>
          <span className="status-dot" style={{ background: status.dot }} />
          {t(`supplier.offers.status.${o.status}`)}
        </span>
      </div>

      <div className="oc-title-block">
        <div className="oc-title">{o.title}</div>
        {o.mixed ? (
          <div className="cut-chips">
            {visibleCuts.map((it) => <span key={it.name} className="cut-chip">{it.name}</span>)}
            {moreCuts > 0 && (
              <span className="cut-chip is-more">{t("supplier.offers.card.moreCuts", { count: moreCuts })}</span>
            )}
          </div>
        ) : (
          <div className="oc-cut-text">{o.cutsLabel}</div>
        )}
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.origin")}</span>
          <span className="cm-value">
            <FlagSVG code={o.originCountryCode} size={13} />
            {o.originCountry}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.destination")}</span>
          <span className="cm-value">
            {firstDest && <FlagSVG code={firstDest.code} size={13} />}
            {destLabel}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.incoterm")}</span>
          <span className="cm-value">{incotermLabel}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.offers.card.shipment")}</span>
          <span className="cm-value">{o.shipmentLabel}</span>
        </div>
      </div>

      <div className="oc-footer">
        <div className="oc-price">
          <span className="cur">{t("supplier.offers.card.priceStartingFrom")}</span>
          <span className="amt">US$ {formatPrice(o.pricePerFclUsd)}</span>
          <span className="unit">{t("supplier.offers.card.perFcl")}</span>
        </div>
        <span className="oc-cta">
          {t("supplier.offers.card.viewDetails")} <ArrowRightIcon size={12} />
        </span>
      </div>
    </article>
  );
}

export default function SupplierOffers() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [shown, setShown] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priceDesc" | "priceAsc">("newest");

  const sorted = useMemo(() => {
    const copy = [...MOCK_SUPPLIER_OFFERS];
    copy.sort((a, b) => {
      if (sortBy === "newest") return b.id.localeCompare(a.id);
      if (sortBy === "oldest") return a.id.localeCompare(b.id);
      if (sortBy === "priceDesc") return b.pricePerFclUsd - a.pricePerFclUsd;
      return a.pricePerFclUsd - b.pricePerFclUsd;
    });
    return copy;
  }, [sortBy]);

  const total = sorted.length;
  const visible = sorted.slice(0, shown);
  const hasMore = shown < total;

  return (
    <>
      <section className="hero" style={{ marginBottom: 24 }}>
        <h2>{t("supplier.offers.heroTitle")}</h2>
        <div className="hero-photo" aria-hidden="true" />
      </section>

      <Crumbs
        items={[
          { label: t("supplier.offers.crumbHome"), to: "/supplier" },
          { label: t("supplier.offers.title") },
        ]}
      />

      <PageTitle icon={TagIcon} title={t("supplier.offers.title")} />

      <div className="so-toolbar">
        <span className="result-count">
          {t("supplier.offers.showing", { from: 1, to: visible.length, total })}
        </span>
        <div className="mini-select-wrap">
          <select
            className="mini-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label={t("supplier.offers.sortBy")}
          >
            <option value="newest">{t("supplier.offers.sort.newest")}</option>
            <option value="oldest">{t("supplier.offers.sort.oldest")}</option>
            <option value="priceDesc">{t("supplier.offers.sort.priceDesc")}</option>
            <option value="priceAsc">{t("supplier.offers.sort.priceAsc")}</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-tb is-primary"
          onClick={() => navigate("/supplier/offers/new")}
        >
          <PlusIcon size={14} /> {t("supplier.offers.createOffer")}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state"><p>{t("supplier.offers.empty")}</p></div>
      ) : (
        <>
          <div className="card-row">
            {visible.map((o) => (
              <SupplierOfferCard
                key={o.id}
                o={o}
                t={t}
                onOpen={() => navigate(`/supplier/offers/${o.id}`)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="so-load-more">
              <button type="button" onClick={() => setShown(shown + PAGE_SIZE)}>
                {t("supplier.offers.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}