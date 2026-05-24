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
      <section className="hero">
        <h2>{t("buyer.home.hero")}</h2>
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
        <div className="card-row"><MiniSkeleton /></div>
      ) : recentOffers.length === 0 ? (
        <div className="card-row-empty">{t("buyer.home.emptyOffers")}</div>
      ) : (
        <div className="card-row">
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
        <div className="card-row"><MiniSkeleton /></div>
      ) : recentOrders.length === 0 ? (
        <div className="card-row-empty">{t("buyer.home.emptyOrders")}</div>
      ) : (
        <div className="card-row">
          {recentOrders.map((o) => <RecentOrderCard key={o.id} o={o} />)}
        </div>
      )}
    </>
  );
}
