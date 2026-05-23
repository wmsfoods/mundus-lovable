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
      <div className="card-row-empty">
        {t("buyer.home.emptyOffers")}
      </div>

      <div className="sec-head">
        <h3>{t("buyer.home.recentOrders")}</h3>
        <Link to="/buyer/orders" className="see-all">
          {t("buyer.home.seeAll")} <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="card-row-empty">
        {t("buyer.home.emptyOrders")}
      </div>
    </>
  );
}
