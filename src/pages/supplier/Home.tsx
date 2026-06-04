import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  SparkleIcon,
  FlagIcon,
  CheckCircleIcon,
  ArrowsLeftRightIcon,
  CartIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFullName } from "@/hooks/useUserFullName";
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { useSupplierDashboard } from "@/hooks/useSupplierDashboard";
import { useSupplierSales } from "@/hooks/useSupplierSales";
import { useActiveOffice } from "@/hooks/useActiveOffice";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { SupplierOfferCard } from "@/components/supplier/OfferCard";
import ByOfficeRollup from "@/components/supplier/ByOfficeRollup";
import { StatusBadge } from "@/lib/orderStatus";
import { supabase } from "@/integrations/supabase/client";

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

export default function SupplierHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeOffice, isAllOffices, isGlobalDirector } = useActiveOffice();
  const officeFocus = activeOffice && !isAllOffices;
  const officeName = officeFocus ? (activeOffice.office_name || activeOffice.name) : "";
  const greetingKey = useGreetingKey();
  const { fullName } = useUserFullName();
  const displayName =
    fullName ||
    (user?.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "there")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const { offers, loading } = useRealSupplierOffers();
  const dash = useSupplierDashboard();
  const { data: sales, isLoading: salesLoading } = useSupplierSales();
  const isMobile = useIsMobileShell();
  const maxItems = isMobile ? 5 : 7;

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

  const recentOffers = useMemo(() => offers.slice(0, maxItems), [offers, maxItems]);
  const recentSales = useMemo(() => sales.slice(0, maxItems), [sales, maxItems]);

  const [negCounts, setNegCounts] = useState<Record<string, { total: number; companies: number }>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("offer_id, buyer_company_id")
        .not("status", "in", "(expired,offer_withdrawn,bid_accepted)")
        .is("deleted_at", null);
      if (cancelled) return;
      const byOffer: Record<string, { total: number; companies: Set<string> }> = {};
      (data ?? []).forEach((n: { offer_id: string; buyer_company_id: string }) => {
        const e = byOffer[n.offer_id] ?? { total: 0, companies: new Set<string>() };
        e.total += 1;
        if (n.buyer_company_id) e.companies.add(n.buyer_company_id);
        byOffer[n.offer_id] = e;
      });
      const counts: Record<string, { total: number; companies: number }> = {};
      Object.entries(byOffer).forEach(([k, v]) => {
        counts[k] = { total: v.total, companies: v.companies.size };
      });
      setNegCounts(counts);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <h1 className="sr-only">Supplier Dashboard — Sales Overview</h1>
      <section className="hero sh-hero">
        <span className="sh-hero-glow sh-hero-glow--a" aria-hidden />
        <span className="sh-hero-glow sh-hero-glow--b" aria-hidden />
        <div className="sh-hero-inner">
          <div className="sh-hero-main">
            <span className="sh-greeting">
              <span className="sh-greeting-pulse">
                <span className="ping" />
                <span className="dot" />
              </span>
              {t(`supplier.home.greeting.${greetingKey}`, { name: displayName })}
            </span>
            <h2>
              <span className="sh-hero-title-lead">{t("supplier.home.heroTitle")}</span>
            </h2>
            <p className="sh-hero-sub">
              {t("supplier.home.heroSub", {
                defaultValue: "Your operations are running smoothly. Here's a quick snapshot of your activity.",
              })}
            </p>
          </div>

          <div className="sh-hero-stats" aria-hidden={false}>
            <div className="sh-hero-stat">
              <div className="sh-hero-stat-row">
                <div>
                  <p className="sh-hero-stat-label">{t("supplier.home.stats.activeOffers")}</p>
                  <p className="sh-hero-stat-value">{dash.activeOffers ?? "—"}</p>
                </div>
                <span className="sh-hero-stat-ic sh-hero-stat-ic--primary">
                  <SparkleIcon size={18} />
                </span>
              </div>
              <div className="sh-hero-stat-bar">
                <span className="sh-hero-stat-bar-fill sh-hero-stat-bar-fill--primary" style={{ width: "72%" }} />
              </div>
            </div>

            <div className="sh-hero-stat">
              <div className="sh-hero-stat-row">
                <div>
                  <p className="sh-hero-stat-label">{t("supplier.home.stats.closedDeals")}</p>
                  <p className="sh-hero-stat-value">{dash.closedDeals ?? "—"}</p>
                </div>
                <span className="sh-hero-stat-ic sh-hero-stat-ic--success">
                  <CheckCircleIcon size={18} />
                </span>
              </div>
              <div className="sh-hero-stat-bar">
                <span className="sh-hero-stat-bar-fill sh-hero-stat-bar-fill--success" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats">
        {kpis.map((k) => <StatCard key={k.key} k={k} t={t} />)}
      </div>

      {isGlobalDirector && isAllOffices && <ByOfficeRollup />}

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
          <div className="empty-state" style={{ padding: 24, color: "#6b7280" }}>
            {officeFocus
              ? t("supplier.home.emptyOffersForOffice", { defaultValue: "No offers yet for {{office}}.", office: officeName })
              : t("supplier.home.emptyOffers", { defaultValue: "No offers yet." })}
          </div>
        ) : (
          recentOffers.map((o) => (
            <SupplierOfferCard
              key={o.id}
              o={o}
              t={t}
              negInfo={negCounts[o.id]}
              onOpen={() => navigate(`/supplier/offers/${o.id}`)}
            />
          ))
        )}
      </div>

      <div className="sec-head">
        <h3>{t("supplier.home.recentSales")}</h3>
        <Link to="/supplier/sales" className="see-all">
          {t("supplier.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="sh-card-row">
        <div className="empty-state" style={{ padding: 24, color: "#6b7280" }}>
        </div>
      </div>
    </>
  );
}
