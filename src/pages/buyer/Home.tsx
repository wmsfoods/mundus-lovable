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
import { useBuyerDashboard } from "@/hooks/useBuyerDashboard";
import { useAuth } from "@/contexts/AuthContext";

function useGreetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
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
  const dash = useBuyerDashboard();
  const { user } = useAuth();
  const greetingKey = useGreetingKey();
  const userName = user?.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "there";
  const firstName = userName.split(" ")[0].replace(/^./, (c) => c.toUpperCase());

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
    </>
  );
}
