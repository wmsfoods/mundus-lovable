import type { ComponentType } from "react";
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
  MessageIcon,
  ClockIcon,
  ClipboardIcon,
  EyeIcon,
} from "@/components/icons";
import {
  SUPPLIER_KPIS,
  SUPPLIER_ATTENTION,
  SUPPLIER_RECENT_OFFERS,
  SUPPLIER_RECENT_SALES,
  type SupplierKpi,
  type AttentionAlert,
  type SupplierOfferCard,
  type SupplierSaleCard,
} from "@/data/mockSupplierHome";
import { useAuth } from "@/contexts/AuthContext";

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

const ATTENTION_ICONS: Record<AttentionAlert["tone"], IconCmp> = {
  warning: MessageIcon,
  info: ClockIcon,
  purple: ClipboardIcon,
};

function AttentionRow({ a, t }: { a: AttentionAlert; t: TFn }) {
  const I = ATTENTION_ICONS[a.tone];
  return (
    <div className={`sh-attention-row is-${a.tone}`}>
      <span className="ic"><I size={16} /></span>
      <div className="body">
        <p className="title">{t(`supplier.home.${a.title}`)}</p>
        <p className="sub">{t(`supplier.home.${a.subtitle}`)}</p>
      </div>
      <Link to={a.ctaPath} className="cta">
        {t(`supplier.home.${a.ctaKey}`)} <ArrowRightIcon size={12} />
      </Link>
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

function HomeOfferCard({ o, t }: { o: SupplierOfferCard; t: TFn }) {
  const statusClass = o.status === "Available" ? "pill-active" : "pill-pending";
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
          {o.status === "Available" ? t("supplier.home.statusAvailable") : t("supplier.home.statusNew")}
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
      <div className="oc-stats">
        <span className="stat-item"><EyeIcon size={12} /> {o.views} {t("supplier.home.card.views")}</span>
        <span className="dot-sep" />
        <span className="stat-item"><MessageIcon size={12} /> {o.proposals} {t("supplier.home.card.proposals")}</span>
        <span className="dot-sep" />
        <span className={`stat-item ${o.daysLeft <= 7 ? "danger" : ""}`}>
          <ClockIcon size={12} /> {o.daysLeft}{t("supplier.home.card.daysLeft")}
        </span>
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

function HomeSaleCard({ s, t }: { s: SupplierSaleCard; t: TFn }) {
  const STATUS_CLASS: Record<SupplierSaleCard["status"], string> = {
    AwaitingPrePayment: "pill-pending",
    PrePaidLoading: "pill-info",
    InTransit: "pill-info",
    BalanceDue: "pill-pending",
  };
  return (
    <Link to="/supplier/sales" className="oc">
      <div className="oc-head">
        <div className="oc-head-l">
          <span className="oc-chip"><TagIcon size={14} /></span>
          <span className="oc-cat">{s.category}</span>
          <span className="dot-sep" />
          <span className="oc-temp">{s.condition}</span>
        </div>
        <span className={`pill ${STATUS_CLASS[s.status]}`}>
          {t(`supplier.home.saleStatus.${s.status}`)}
        </span>
      </div>
      <div className="oc-title-block">
        <div className="oc-title">{s.title}</div>
        <span className="oc-cut-text">
          {t("supplier.home.card.order", { id: s.orderNumber })} · {s.orderDate}
        </span>
      </div>
      <div className="oc-meta-tight">
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.buyer")}</span>
          <span className="cm-value">{s.buyer}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.destination")}</span>
          <span className="cm-value">{s.destinationFlag} {s.destination}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.incoterm")}</span>
          <span className="cm-value">{s.incoterm}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.home.card.shipment")}</span>
          <span className="cm-value">{s.shipment}</span>
        </div>
      </div>
      <div className="oc-footer">
        <div className="oc-qty">
          <span className="cur">{t("supplier.home.card.qty")}</span>
          <span className="amt">{new Intl.NumberFormat("de-DE").format(s.qtyKg)}</span>
          <span className="unit">kg</span>
        </div>
        <span className="oc-cta">{t(`supplier.home.card.${s.ctaKey}`)} <ArrowRightIcon size={12} /></span>
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

      <div className="sh-attention">
        <div className="sh-attention-head">
          <MessageIcon size={14} />
          {t("supplier.home.attention.title")}
          <span className="count">{SUPPLIER_ATTENTION.length}</span>
        </div>
        <div className="sh-attention-list">
          {SUPPLIER_ATTENTION.map((a) => <AttentionRow key={a.id} a={a} t={t} />)}
        </div>
      </div>

      <div className="stats">
        {SUPPLIER_KPIS.map((k) => <StatCard key={k.key} k={k} t={t} />)}
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
        {SUPPLIER_RECENT_OFFERS.map((o) => <HomeOfferCard key={o.id} o={o} t={t} />)}
      </div>

      <div className="sec-head">
        <h3>{t("supplier.home.recentSales")}</h3>
        <Link to="/supplier/sales" className="see-all">
          {t("supplier.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="sh-card-row">
        {SUPPLIER_RECENT_SALES.map((s) => <HomeSaleCard key={s.id} s={s} t={t} />)}
      </div>
    </>
  );
}
