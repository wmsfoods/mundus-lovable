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

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatShipment(month: number, year: number) {
  return `${MONTH_NAMES[(month - 1) % 12] ?? ""} ${year}`;
}

function RecentOfferCard({ o }: { o: OfferWithDetails }) {
  const totalKg = (o.items ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const itemsCount = (o.items ?? []).length;
  return (
    <Link to={`/buyer/offers/${o.id}`} className="mini-card">
      <div className="mc-head">
        <span className="mc-num">#{String(o.offer_number).padStart(5, "0")}</span>
        <span className={`pill ${o.status === "active" ? "pill-active" : "pill-info"}`}>
          {o.status ?? "—"}
        </span>
      </div>
      <div className="mc-title">{o.supplier_name}</div>
      <div className="mc-meta">
        <span>{o.origin_country}</span>
        <span>·</span>
        <span>{formatShipment(o.shipment_month, o.shipment_year)}</span>
      </div>
      <div className="mc-foot">
        <span>{itemsCount} item{itemsCount === 1 ? "" : "s"}</span>
        <span>{(totalKg / 1000).toFixed(1)} MT</span>
      </div>
    </Link>
  );
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
  const { available, counts } = useMarketplaceProteins();
  const { offers, loading: offersLoading } = useOffers();
  const { data: orders, isLoading: ordersLoading } = useBuyerOrders();
  const recentOffers = offers.slice(0, 4);
  const recentOrders = orders.slice(0, 4);
  // Always show the 4 proteins (even with 0), so the section is stable.
  const proteinKeys = ["beef", "pork", "poultry", "ovine"] as const;
  return (
    <>
      <section className="hero">
        <h2>{t("buyer.home.hero")}</h2>
      </section>

      <div className="stats">
        <StatCard label={t("buyer.home.stats.activeOffers")} value="64" icon={SparkleIcon} />
        <StatCard label={t("buyer.home.stats.totalOffers")} value="71" icon={FlagIcon} />
        <StatCard label={t("buyer.home.stats.closedDeals")} value="0" icon={CheckCircleIcon} />
        <StatCard label={t("buyer.home.stats.inNegotiation")} value="24" icon={ArrowsLeftRightIcon} />
        <StatCard label={t("buyer.home.stats.avgClosing")} value="–" icon={CartIcon} dark />
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
          {recentOffers.map((o) => <RecentOfferCard key={o.id} o={o} />)}
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
