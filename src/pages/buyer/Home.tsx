import { Link } from "react-router-dom";
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
  return (
    <>
      <section className="hero">
        <h2>Sell smarter, negotiate faster, stay in control.</h2>
        <div className="hero-photo" aria-hidden="true" />
      </section>

      <div className="stats">
        <StatCard label="Active Offers" value="64" icon={SparkleIcon} />
        <StatCard label="Total Offers" value="71" icon={FlagIcon} />
        <StatCard label="Closed Deals" value="0" icon={CheckCircleIcon} />
        <StatCard label="In Negotiation" value="24" icon={ArrowsLeftRightIcon} />
        <StatCard label="Average order closing time" value="–" icon={CartIcon} dark />
      </div>

      <div className="action-row">
        <ActionCard
          icon={FileTextIcon}
          title="Orders"
          desc="View and manage your orders."
          ctaLabel="See orders"
          to="/buyer/orders"
        />
        <ActionCard
          icon={TagIcon}
          title="Offers"
          desc="Browse and manage offers."
          ctaLabel="See products"
          to="/buyer/offers"
        />
      </div>

      <div className="sec-head">
        <h3>Recent offers</h3>
        <Link to="/buyer/offers" className="see-all">
          See all <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="card-row-empty">
        Recent offers will appear here once the marketplace is populated.
      </div>

      <div className="sec-head">
        <h3>Recent orders</h3>
        <Link to="/buyer/orders" className="see-all">
          See all <ArrowRightIcon size={14} />
        </Link>
      </div>
      <div className="card-row-empty">
        Recent orders will appear here once you have purchased offers.
      </div>
    </>
  );
}
