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
import { useRealSupplierOffers } from "@/hooks/useRealSupplierOffers";
import { useSupplierDashboard } from "@/hooks/useSupplierDashboard";
import { SupplierOfferCard } from "@/components/supplier/OfferCard";
import { supabase } from "@/integrations/supabase/client";
import { HeroMarquee } from "@/components/mundus/HeroMarquee";

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

  const recentOffers = useMemo(() => offers.slice(0, 3), [offers]);

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
      <section className="hero" style={{
        position: "relative",
        background: "linear-gradient(100deg, #6C0B28 0%, #A74764 55%, #EEC7D4 100%)",
        borderRadius: 12,
        padding: "32px 56px",
        minHeight: 168,
        display: "flex",
        alignItems: "center",
        color: "#fff",
        marginBottom: 24,
        overflow: "hidden",
      }}>
        <h2 style={{
          fontSize: 28,
          lineHeight: 1.2,
          fontWeight: 600,
          margin: 0,
          maxWidth: "42%",
          letterSpacing: "-0.01em",
          position: "relative",
          zIndex: 2,
        }}>
          {t("supplier.home.hero_title", "Sell smarter, negotiate faster, stay in control.")}
        </h2>
        <HeroMarquee perRow={6} rows={2} speed={55} />
      </section>

      <div className="stats">
        {kpis.map((k) => <StatCard key={k.key} k={k} t={t} />)}
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
        <div className="empty-state" style={{ padding: 24, color: "#6b7280" }}>{t("supplier.home.emptySales", { defaultValue: "No sales yet." })}</div>
      </div>
    </>
  );
}
