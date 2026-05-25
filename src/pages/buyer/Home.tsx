import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  SparkleIcon,
  ArrowsLeftRightIcon,
  FileTextIcon,
  TagIcon,
  ArrowTopRightIcon,
  ArrowRightIcon,
} from "@/components/icons";
import { PROTEIN_META } from "@/components/marketplace/ProteinFilter";
import { useMarketplaceProteins } from "@/hooks/useMarketplaceProteins";
import { useOffers, type OfferWithDetails } from "@/hooks/useOffers";
import { useBuyerOrders, type BuyerOrder } from "@/hooks/useBuyerOrders";
import { OfferCard } from "@/pages/buyer/Offers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useBuyerDashboard } from "@/hooks/useBuyerDashboard";
import { useAuth } from "@/contexts/AuthContext";

function useGreetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatShipment(month: number, year: number) {
  return `${MONTH_NAMES[(month - 1) % 12] ?? ""} ${year}`;
}

function RecentOrderCard({ o }: { o: BuyerOrder }) {
  return (
    <Link to={`/buyer/orders/${o.id}`} className="mini-card">
      <div className="mc-head">
        <span className="mc-num">#{o.orderNumber}</span>
        <span className="pill pill-info">{o.status.replace(/_/g, " ")}</span>
      </div>
      <div className="mc-title">{o.supplierName}</div>
      <div className="mc-meta">
        <span>{o.origin}</span>
        <span>→</span>
        <span>{o.destination}</span>
      </div>
      <div className="mc-foot">
        <span>{o.shipmentMonth}</span>
        <span>{o.fcls} × {o.fclSize}</span>
      </div>
    </Link>
  );
}

function MiniSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mini-card mini-card-skeleton" />
      ))}
    </>
  );
}

// =========================================================================
// Stat card
// =========================================================================
type StatCardProps = {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
  dark?: boolean;
};

function StatCard({ label, value, icon: I, dark }: StatCardProps) {
  return (
    <div className={`stat ${dark ? "is-dark" : ""}`.trim()}>
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      <span className="ic">
        <I size={28} />
      </span>
    </div>
  );
}

// =========================================================================
// Action card (links to a sub-route)
// =========================================================================
type ActionCardProps = {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  desc: string;
  ctaLabel: string;
  to: string;
  primary?: boolean;
};

function ActionCard({ icon: I, title, desc, ctaLabel, to, primary }: ActionCardProps) {
  return (
    <div className={`action-card ${primary ? "is-primary" : ""}`.trim()}>
      <div className="head">
        <span className="ic-chip">
          <I size={18} />
        </span>
        <span className="title">{title}</span>
      </div>
      <p className="desc">{desc}</p>
      <Link to={to} className="btn-block">
        {ctaLabel} <ArrowTopRightIcon size={14} />
      </Link>
    </div>
  );
}

// =========================================================================
// Page
// =========================================================================
export default function BuyerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { available, counts } = useMarketplaceProteins();
  const { offers, loading: offersLoading } = useOffers();
  const { data: orders, isLoading: ordersLoading } = useBuyerOrders();
  const recentOffers = offers.slice(0, 4);
  const recentOrders = orders.slice(0, 4);

  const { company } = useCurrentCompany();
  const buyerCompanyId = company?.id ?? null;
  const dash = useBuyerDashboard();
  const fmt = (v: number | undefined) => (v === undefined ? "—" : String(v));
  const { user } = useAuth();
  const greetingKey = useGreetingKey();
  const userName = user?.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "there";
  const firstName = userName.split(" ")[0].replace(/^./, (c) => c.toUpperCase());

  const { data: myNegotiations } = useQuery({
    queryKey: ["my-negotiations-map", buyerCompanyId],
    enabled: !!buyerCompanyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("id, offer_id, status")
        .eq("buyer_company_id", buyerCompanyId!)
        .not("status", "in", "(expired,offer_withdrawn)")
        .is("deleted_at", null);
      return data || [];
    },
  });
  const myNegMap: Record<string, { id: string; status: string }> = {};
  myNegotiations?.forEach((n) => {
    myNegMap[n.offer_id] = { id: n.id, status: n.status };
  });
  // Always show the 4 proteins (even with 0), so the section is stable.
  const proteinKeys = ["beef", "pork", "poultry", "ovine"] as const;
  return (
    <>
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
              {t(`supplier.home.greeting.${greetingKey}`, { name: firstName, defaultValue: `Good ${greetingKey}, ${firstName}` })}
            </span>
            <h2>
              <span className="sh-hero-title-lead">{t("buyer.home.hero")}</span>
            </h2>
            <p className="sh-hero-sub">
              {t("buyer.home.heroSub", {
                defaultValue: "Here's a quick snapshot of your sourcing activity.",
              })}
            </p>
          </div>

          <div className="sh-hero-stats" aria-hidden={false}>
            <div className="sh-hero-stat">
              <div className="sh-hero-stat-row">
                <div>
                  <p className="sh-hero-stat-label">{t("buyer.home.stats.activeOffers", { defaultValue: "Marketplace offers" })}</p>
                  <p className="sh-hero-stat-value">{dash.marketplaceOffers ?? "—"}</p>
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
                  <p className="sh-hero-stat-label">{t("buyer.home.stats.inNegotiation", { defaultValue: "Active negotiations" })}</p>
                  <p className="sh-hero-stat-value">{dash.negotiations ?? "—"}</p>
                </div>
                <span className="sh-hero-stat-ic sh-hero-stat-ic--success">
                  <ArrowsLeftRightIcon size={18} />
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
        <StatCard label="Marketplace offers" value={fmt(dash.marketplaceOffers)} icon={SparkleIcon} />
        <StatCard label="Active negotiations" value={fmt(dash.negotiations)} icon={ArrowsLeftRightIcon} />
        <StatCard label="Closed deals" value={fmt(dash.closedDeals)} icon={CheckCircleIcon} />
        <StatCard label="My orders" value={fmt(dash.orders)} icon={FileTextIcon} />
        <StatCard label="My requests" value={fmt(dash.requests)} icon={FlagIcon} dark />
      </div>

      <div className="action-row">
        <ActionCard
          icon={FileTextIcon}
          title={t("buyer.home.actions.ordersTitle")}
          desc={t("buyer.home.actions.ordersDesc")}
          ctaLabel={t("buyer.home.actions.ordersCta")}
          to="/buyer/orders"
        />
        <ActionCard
          icon={TagIcon}
          title={t("buyer.home.actions.offersTitle")}
          desc={t("buyer.home.actions.offersDesc")}
          ctaLabel={t("buyer.home.actions.offersCta")}
          to="/buyer/offers"
        />
      </div>

      <div className="sec-head">
        <h3>{t("buyer.home.exploreByProtein", "Explore by protein")}</h3>
        <Link to="/buyer/offers" className="see-all">
          {t("buyer.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="protein-explore">
        {proteinKeys.map((k) => {
          const meta = PROTEIN_META[k];
          const c = counts[k] ?? 0;
          return (
            <Link key={k} to={`/buyer/offers?protein=${k}`} className="pe-card">
              <span className="pe-emoji" aria-hidden="true">{meta.emoji}</span>
              <span className="pe-body">
                <span className="pe-name">{meta.label}</span>
                <span className="pe-count">
                  {c > 0
                    ? t("buyer.home.protein.offersCount", { count: c, defaultValue: "{{count}} offers" })
                    : t("buyer.home.protein.noOffers", "No offers")}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {/* Hide unavailable to keep usage in the linter (no-op) */}
      {available.length === 0 ? null : null}

      <div className="sec-head">
        <h3>{t("buyer.home.recentOffers")}</h3>
        <Link to="/buyer/offers" className="see-all">
          {t("buyer.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      {offersLoading ? (
        <div className="card-row sh-card-row"><MiniSkeleton /></div>
      ) : recentOffers.length === 0 ? (
        <div className="card-row-empty">{t("buyer.home.emptyOffers")}</div>
      ) : (
        <div className="card-row sh-card-row">
          {recentOffers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              onOpen={() => navigate(`/buyer/offers/${o.id}`)}
              myNeg={myNegMap[o.id]}
            />
          ))}
        </div>
      )}

      <div className="sec-head">
        <h3>{t("buyer.home.recentOrders")}</h3>
        <Link to="/buyer/orders" className="see-all">
          {t("buyer.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      {ordersLoading ? (
        <div className="card-row sh-card-row"><MiniSkeleton /></div>
      ) : recentOrders.length === 0 ? (
        <div className="card-row-empty">{t("buyer.home.emptyOrders")}</div>
      ) : (
        <div className="card-row sh-card-row">
          {recentOrders.map((o) => <RecentOrderCard key={o.id} o={o} />)}
        </div>
      )}
    </>
  );
}
