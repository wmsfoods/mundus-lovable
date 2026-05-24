import { useMemo, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  SparkleIcon,
  FlagIcon,
  CheckCircleIcon,
  ArrowsLeftRightIcon,
  CartIcon,
  FileTextIcon,
  TagIcon,
  PlusIcon,
  ArrowRightIcon,
  ArrowTopRightIcon,
} from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { useSupplierDashboard } from "@/hooks/useSupplierDashboard";

type SupplierKpi = {
  key: "activeOffers" | "totalOffers" | "closedDeals" | "inNegotiation" | "avgClosing";
  value: string | number;
  delta: number;
  deltaUnit?: string;
  isDark?: boolean;
};

type IconCmp = ComponentType<{ size?: number }>;
type TFn = (key: string, opts?: Record<string, unknown>) => string;

function useGreetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

const STAT_ICONS: Record<SupplierKpi["key"], IconCmp> = {
  activeOffers:  SparkleIcon,
  totalOffers:   FlagIcon,
  closedDeals:   CheckCircleIcon,
  inNegotiation: ArrowsLeftRightIcon,
  avgClosing:    CartIcon,
};

function StatCard({ k, t }: { k: SupplierKpi; t: TFn }) {
  const I = STAT_ICONS[k.key];
  const isUp = k.delta > 0;
  const isDown = k.delta < 0;
  const sign = isUp ? "+" : "";
  return (
    <div className={`stat ${k.isDark ? "is-dark" : ""}`.trim()}>
      <span className="label">{t(`supplier.home.stats.${k.key}`)}</span>
      <span className="value">
        {k.value}
        {k.key === "avgClosing" && (
          <span style={{ fontSize: 14, marginLeft: 6, opacity: 0.7, fontWeight: 400 }}>
            {t("supplier.home.stats.days")}
          </span>
        )}
      </span>
      {k.delta !== 0 && (
        <span className={`sh-stat-delta ${isUp ? "is-up" : isDown ? "is-down" : ""}`.trim()}>
          <span className="arrow">{isUp ? "↗" : isDown ? "↘" : ""}</span>
          {sign}{k.delta} {t(`supplier.home.${k.deltaUnit ?? "vsLastWeek"}`)}
        </span>
      )}
      <span className="ic"><I size={28} /></span>
    </div>
  );
}

function ActionCard(props: {
  icon: IconCmp;
  title: string;
  desc: string;
  ctaLabel: string;
  to: string;
  primary?: boolean;
}) {
  const I = props.icon;
  return (
    <div className={`action-card ${props.primary ? "is-primary" : ""}`.trim()}>
      <div className="head">
        <span className="ic-chip"><I size={18} /></span>
        <span className="title">{props.title}</span>
      </div>
      <p className="desc">{props.desc}</p>
      <Link to={props.to} className="btn-block">
        {props.ctaLabel} <ArrowTopRightIcon size={14} />
      </Link>
    </div>
  );
}

type HomeOfferCardData = {
  id: string;
  category: string;
  condition: string;
  cutCount: number;
  status: "active" | "new" | "negotiating" | "closed" | "inactive" | "sold_out";
  title: string;
  cuts: string[];
  destinationFlag: string;
  destination: string;
  incoterm: string;
  shipment: string;
  volumeMt: number;
  qtyMt: number;
};

function HomeOfferCard({ o, t }: { o: HomeOfferCardData; t: TFn }) {
  const statusClass = o.status === "active" ? "pill-active" : "pill-pending";
  const visibleCuts = o.cuts.slice(0, 3);
  const moreCount = Math.max(0, o.cuts.length - visibleCuts.length);
  return (
    <Link to="/supplier/offers" className="oc">
      <div className="oc-head">
        <div className="oc-head-l">
          <span className="oc-chip"><TagIcon size={14} /></span>
          <span className="oc-cat">{o.category}</span>
          <span className="dot-sep" />
          <span className="oc-temp">{o.condition}</span>
          {o.cutCount > 1 && (
            <>
              <span className="dot-sep" />
              <span className="oc-temp">{o.cutCount} {t("supplier.home.cuts")}</span>
            </>
          )}
        </div>
        <span className={`pill ${statusClass}`}>
          {o.status === "active" ? t("supplier.home.statusAvailable") : t("supplier.home.statusNew")}
        </span>
      </div>
      <div className="oc-title-block">
        <div className="oc-title">{o.title}</div>
        {visibleCuts.length > 0 && (
          <div className="cut-chips">
            {visibleCuts.map((c) => <span key={c} className="cut-chip">{c}</span>)}
            {moreCount > 0 && <span className="cut-chip is-more">+{moreCount} {t("supplier.home.more")}</span>}
          </div>
        )}
      </div>
      <div className="oc-meta-tight">
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.destination")}</span>
          <span className="cm-value">{o.destinationFlag} {o.destination}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.incoterm")}</span>
          <span className="cm-value">{o.incoterm}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.shipment")}</span>
          <span className="cm-value">{o.shipment}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.volume")}</span>
          <span className="cm-value">{o.volumeMt} {t("supplier.home.mt")}</span>
        </div>
      </div>
      <div className="oc-footer">
        <div className="oc-qty">
          <span className="cur">{t("supplier.home.card.qty")}</span>
          <span className="amt">{o.qtyMt}</span>
          <span className="unit">{t("supplier.home.mt")}</span>
        </div>
        <span className="oc-cta">{t("supplier.home.card.openOffer")} <ArrowRightIcon size={12} /></span>
      </div>
    </Link>
  );
}

export default function SupplierHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const greetingKey = useGreetingKey();
  const userName = user?.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "Antonio";
  const firstName = userName.split(" ")[0].replace(/^./, (c) => c.toUpperCase());
  const { offers, loading } = useRealSupplierOffers();
  const dash = useSupplierDashboard();

  const kpis = useMemo<SupplierKpi[]>(() => {
    const v = (n: number | undefined) => (n === undefined ? "—" : n);
    return [
      { key: "activeOffers", value: v(dash.activeOffers), delta: 0 },
      { key: "totalOffers", value: v(dash.totalOffers), delta: 0 },
      { key: "closedDeals", value: v(dash.closedDeals), delta: 0 },
      { key: "inNegotiation", value: v(dash.inNegotiation), delta: 0 },
      { key: "avgClosing", value: "—", delta: 0 },
    ];
  }, [dash.activeOffers, dash.totalOffers, dash.closedDeals, dash.inNegotiation]);

  const recentOffers = useMemo<HomeOfferCardData[]>(() => {
    return offers.slice(0, 3).map((o) => ({
      id: o.id,
      category: o.category,
      condition: o.condition,
      cutCount: o.items.length,
      status: o.status,
      title: o.title,
      cuts: o.items.map((it) => it.name),
      destinationFlag: o.destinations[0]?.code ?? "",
      destination: o.destinations[0]?.name ?? "—",
      incoterm: o.incoterms[0] ?? "—",
      shipment: o.shipmentLabel,
      volumeMt: Math.round(o.totalKg / 1000),
      qtyMt: Math.round(o.totalKg / 1000),
    }));
  }, [offers]);

  return (
    <>
      <section className="hero sh-hero">
        <div className="sh-hero-inner">
          <span className="sh-greeting">
            <span className="dot" /> {t(`supplier.home.greeting.${greetingKey}`, { name: firstName })}
          </span>
          <h2>{t("supplier.home.heroTitle")}</h2>
          <p className="sh-hero-sub">{t("supplier.home.heroSubtitle")}</p>
          <div className="sh-hero-cta">
            <Link to="/supplier/offers/new" className="btn-hero is-light">
              <PlusIcon size={14} /> {t("supplier.home.cta.newOffer")}
            </Link>
            <Link to="/supplier/offers" className="btn-hero is-ghost">
              {t("supplier.home.cta.viewMyOffers")} <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </section>

      <div className="stats">
        {kpis.map((k) => <StatCard key={k.key} k={k} t={t} />)}
      </div>

      <div className="sh-action-row">
        <ActionCard
          icon={FileTextIcon}
          title={t("supplier.home.actions.salesTitle")}
          desc={t("supplier.home.actions.salesDesc")}
          ctaLabel={t("supplier.home.actions.salesCta")}
          to="/supplier/sales"
        />
        <ActionCard
          icon={TagIcon}
          title={t("supplier.home.actions.offersTitle")}
          desc={t("supplier.home.actions.offersDesc")}
          ctaLabel={t("supplier.home.actions.offersCta")}
          to="/supplier/offers"
        />
        <ActionCard
          icon={PlusIcon}
          title={t("supplier.home.actions.newOfferTitle")}
          desc={t("supplier.home.actions.newOfferDesc")}
          ctaLabel={t("supplier.home.actions.newOfferCta")}
          to="/supplier/offers/new"
          primary
        />
      </div>

      <div className="sec-head">
        <h3>{t("supplier.home.recentOffers")}</h3>
        <Link to="/supplier/offers" className="see-all">
          {t("supplier.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="sh-card-row">
        {loading ? (
          <div className="empty-state" style={{ padding: 24, color: "#6b7280" }}>{t("common.loading", { defaultValue: "Loading…" })}</div>
        ) : recentOffers.length === 0 ? (
          <div className="empty-state" style={{ padding: 24, color: "#6b7280" }}>{t("supplier.home.emptyOffers", { defaultValue: "No offers yet." })}</div>
        ) : (
          recentOffers.map((o) => <HomeOfferCard key={o.id} o={o} t={t} />)
        )}
      </div>

      <div className="sec-head">
        <h3>{t("supplier.home.recentSales")}</h3>
        <Link to="/supplier/sales" className="see-all">
          {t("supplier.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="sh-card-row">
        <div className="empty-state" style={{ padding: 24, color: "#6b7280" }}>{t("supplier.home.emptySales", { defaultValue: "No sales yet." })}</div>
      </div>
    </>
  );
}
