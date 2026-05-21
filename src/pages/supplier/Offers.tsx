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
  EyeIcon,
  MessageIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertIcon,
  ListIcon,
} from "@/components/icons";
import { MOCK_SUPPLIER_OFFERS, PAGE_SIZE, type SupplierOffer } from "@/data/mockSupplierOffers";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { ProteinFilter, categoryToProtein, type ProteinKey } from "@/components/marketplace/ProteinFilter";
import { useSupplierProteins } from "@/hooks/useSupplierProteins";

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  active:      { bg: "#e6f7ed", fg: "#15803d", dot: "#16a34a" },
  new:         { bg: "#fff4e0", fg: "#a85b00", dot: "#f59e0b" },
  negotiating: { bg: "#fef0f0", fg: "#b6354b", dot: "#d65370" },
  closed:      { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
  inactive:    { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af" },
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

function SupplierOfferCard({ o, onOpen, t }: { o: SupplierOffer; onOpen: () => void; t: (k: string, opts?: Record<string, unknown>) => string }) {
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
            <span className="mixed-badge cuts-badge-strong">
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

export default function SupplierOffers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { offers: realOffers, loading: realLoading } = useRealSupplierOffers();

  const [shown, setShown] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priceDesc" | "priceAsc">("newest");
  const [cat, setCat] = useState<ProteinKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierOffer["status"]>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { available: supplierProteins, counts: proteinCounts } = useSupplierProteins();

  const filtered = useMemo(() => {
    // Real offers first (newest from DB), then mocks
    let copy: SupplierOffer[] = [...realOffers, ...MOCK_SUPPLIER_OFFERS];
    if (cat !== "all") copy = copy.filter((o) => categoryToProtein(o.category) === cat);
    if (statusFilter !== "all") copy = copy.filter((o) => o.status === statusFilter);
    copy.sort((a, b) => {
      if (sortBy === "newest") return b.id.localeCompare(a.id);
      if (sortBy === "oldest") return a.id.localeCompare(b.id);
      if (sortBy === "priceDesc") return b.pricePerFclUsd - a.pricePerFclUsd;
      return a.pricePerFclUsd - b.pricePerFclUsd;
    });
    return copy;
  }, [sortBy, cat, statusFilter, realOffers]);

  const total = filtered.length;
  const visible = filtered.slice(0, shown);
  const hasMore = shown < total;

  // KPIs (from full mock set, not filtered)
  const kpis = useMemo(() => {
    const all = MOCK_SUPPLIER_OFFERS;
    let views = 0, proposals = 0, expiring = 0;
    for (const o of all) {
      const d = derive(o);
      views += d.views;
      proposals += d.proposals;
      if (d.daysLeft <= 7) expiring += 1;
    }
    return {
      total: all.length,
      available: all.filter((o) => o.status === "active").length,
      negotiating: all.filter((o) => o.status === "negotiating").length,
      expiring,
      views,
      proposals,
    };
  }, []);

  return (
    <>
      <header className="so-header">
        <div className="so-header-l">
          <span className="so-header-icon"><TagIcon size={16} /></span>
          <h1>{t("supplier.offers.title")}</h1>
        </div>
        <button
          type="button"
          className="so-new-btn"
          onClick={() => navigate("/supplier/offers/new")}
        >
          <PlusIcon size={14} /> {t("supplier.offers.newOffer")}
        </button>
      </header>

      <div className="so-kpis">
        <div className="so-kpi"><span className="so-kpi-ic"><TagIcon size={14} /></span><div><span className="so-kpi-n">{kpis.total}</span><span className="so-kpi-l">{t("supplier.offers.kpi.total")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><CheckCircleIcon size={14} /></span><div><span className="so-kpi-n">{kpis.available}</span><span className="so-kpi-l">{t("supplier.offers.kpi.available")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><MessageIcon size={14} /></span><div><span className="so-kpi-n">{kpis.negotiating}</span><span className="so-kpi-l">{t("supplier.offers.kpi.negotiating")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic warn"><ClockIcon size={14} /></span><div><span className="so-kpi-n">{kpis.expiring}</span><span className="so-kpi-l">{t("supplier.offers.kpi.expiring")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><EyeIcon size={14} /></span><div><span className="so-kpi-n">{kpis.views}</span><span className="so-kpi-l">{t("supplier.offers.kpi.views")}</span></div></div>
        <div className="so-kpi"><span className="so-kpi-ic"><AlertIcon size={14} /></span><div><span className="so-kpi-n">{kpis.proposals}</span><span className="so-kpi-l">{t("supplier.offers.kpi.proposals")}</span></div></div>
      </div>

      <div className="so-filterbar">
        <ProteinFilter
          value={cat}
          onChange={setCat}
          available={supplierProteins}
          counts={proteinCounts}
          allLabel={t("supplier.offers.cat.all")}
        />
        <div className="so-toolbar-r">
          <div className="mini-select-wrap">
            <select
              className="mini-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label={t("supplier.offers.statusFilter")}
            >
              <option value="all">{t("supplier.offers.statusFilter")}: {t("supplier.offers.allStatuses")}</option>
              <option value="active">{t("supplier.offers.status.active")}</option>
              <option value="new">{t("supplier.offers.status.new")}</option>
              <option value="negotiating">{t("supplier.offers.status.negotiating")}</option>
              <option value="closed">{t("supplier.offers.status.closed")}</option>
            </select>
          </div>
          <div className="mini-select-wrap">
            <select
              className="mini-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label={t("supplier.offers.sortBy")}
            >
              <option value="newest">{t("supplier.offers.sortBy")}: {t("supplier.offers.sort.newest")}</option>
              <option value="oldest">{t("supplier.offers.sort.oldest")}</option>
              <option value="priceDesc">{t("supplier.offers.sort.priceDesc")}</option>
              <option value="priceAsc">{t("supplier.offers.sort.priceAsc")}</option>
            </select>
          </div>
          <div className="so-view-toggle">
            <button type="button" className={viewMode === "grid" ? "is-active" : ""} onClick={() => setViewMode("grid")} aria-label="Grid view"><GridIcon size={14} /></button>
            <button type="button" className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")} aria-label="List view"><ListIcon size={14} /></button>
          </div>
        </div>
      </div>

      <div className="so-count-row">
        <span className="result-count">
          {t("supplier.offers.showingShort", { shown: visible.length, total })}
        </span>
      </div>

      {realLoading && realOffers.length === 0 && visible.length === 0 ? (
        <div className="so-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="oc" style={{ opacity: 0.5 }}>
              <div style={{ height: 16, background: "#e5e7eb", borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 24, background: "#e5e7eb", borderRadius: 4, marginBottom: 12, width: "70%" }} />
              <div style={{ height: 80, background: "#f3f4f6", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state" style={{ textAlign: "center", padding: "48px 16px" }}>
          <p style={{ marginBottom: 12 }}>{t("supplier.offers.empty", "No offers yet. Create your first offer.")}</p>
          <button type="button" className="so-new-btn" onClick={() => navigate("/supplier/offers/new")}>
            <PlusIcon size={14} /> {t("supplier.offers.newOffer")}
          </button>
        </div>
      ) : (
        <>
          <div className="so-grid">
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