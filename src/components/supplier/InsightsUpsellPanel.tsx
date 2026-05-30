import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { PRO_PRICE_MONTHLY, planForFeature, startProCheckout } from "@/lib/proSubscription";
import {
  X,
  TrendingDown,
  Eye,
  Bell,
  Sparkles,
  BarChart3,
  Users,
  Globe,
  Timer,
  Mail,
  Loader2,
  ArrowRight,
  Wallet,
  Truck,
  type LucideIcon,
} from "lucide-react";

export type UpsellFeature = "price-benchmark" | "analytics" | "procurement";

type Props = {
  open: boolean;
  feature: UpsellFeature;
  onClose: () => void;
};

type BulletKey =
  | "distribution"
  | "ranking"
  | "alerts"
  | "suggested"
  | "funnel"
  | "cohort"
  | "geo"
  | "sla"
  | "spend"
  | "savings"
  | "suppliers"
  | "marketAlerts";

const FEATURES: Record<
  UpsellFeature,
  { bullets: { key: BulletKey; icon: LucideIcon }[]; perks: number; salesSubject: string; i18nRoot: string }
> = {
  "price-benchmark": {
    bullets: [
      { key: "distribution", icon: TrendingDown },
      { key: "ranking", icon: Eye },
      { key: "alerts", icon: Bell },
      { key: "suggested", icon: Sparkles },
    ],
    perks: 3,
    salesSubject: "Mundus Insights – Price benchmark",
    i18nRoot: "supplier.insights.upsell.priceBenchmark",
  },
  analytics: {
    bullets: [
      { key: "funnel", icon: BarChart3 },
      { key: "cohort", icon: Users },
      { key: "geo", icon: Globe },
      { key: "sla", icon: Timer },
    ],
    perks: 4,
    salesSubject: "Mundus Insights – Supplier analytics",
    i18nRoot: "supplier.insights.upsell.analytics",
  },
  procurement: {
    bullets: [
      { key: "spend", icon: Wallet },
      { key: "savings", icon: TrendingDown },
      { key: "suppliers", icon: Truck },
      { key: "marketAlerts", icon: Bell },
    ],
    perks: 4,
    salesSubject: "Mundus Insights – Procurement intelligence",
    i18nRoot: "buyer.procurement.upsell",
  },
};

export function InsightsUpsellPanel({ open, feature, onClose }: Props) {
  const { t } = useTranslation();
  const { company } = useCurrentCompany();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const cfg = FEATURES[feature];
  const root = cfg.i18nRoot;

  const side: "supplier" | "buyer" = feature === "procurement" ? "buyer" : "supplier";
  const plan = planForFeature(feature, side);
  const price = PRO_PRICE_MONTHLY[plan];

  const handleUpgrade = async () => {
    if (!company?.id) {
      toast.error(t("billing.errors.noCompany"));
      return;
    }
    try {
      setSubmitting(true);
      const url = await startProCheckout({
        company_id: company.id,
        plan,
        success_url: `${window.location.origin}/${side}/subscription-success`,
        cancel_url: window.location.href,
      });
      window.location.href = url;
    } catch (e) {
      console.error(e);
      toast.error(t("billing.errors.checkoutFailed"));
      setSubmitting(false);
    }
  };

  const mailtoHref = `mailto:sales@mundus.com?subject=${encodeURIComponent(
    cfg.salesSubject,
  )}&body=${encodeURIComponent(t("supplier.insights.upsell.salesBody"))}`;

  return createPortal(
    <div className={`ins-upsell-root ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button
        type="button"
        className="ins-upsell-backdrop"
        onClick={onClose}
        aria-label={t("common.close")}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className="ins-upsell-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t(`${root}.title`)}
      >
        <header className="ins-upsell-head">
          <div className="ins-upsell-head__chips">
            <span className="ins-upsell-pro">PRO</span>
            <span className="ins-upsell-head__eyebrow">
              {t("supplier.insights.upsell.eyebrow")}
            </span>
          </div>
          <button
            type="button"
            className="ins-upsell-close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </header>

        <div className="ins-upsell-body">
          <h2 className="ins-upsell-title">{t(`${root}.title`)}</h2>
          <p className="ins-upsell-lede">{t(`${root}.lede`)}</p>

          <ul className="ins-upsell-bullets">
            {cfg.bullets.map(({ key, icon: I }) => (
              <li key={key} className="ins-upsell-bullet">
                <span className="ins-upsell-bullet__icon">
                  <I size={16} />
                </span>
                <div>
                  <div className="ins-upsell-bullet__title">
                    {t(`${root}.bullets.${key}.title`)}
                  </div>
                  <div className="ins-upsell-bullet__body">
                    {t(`${root}.bullets.${key}.body`)}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="ins-upsell-perks">
            <div className="ins-upsell-perks__label">
              {t("supplier.insights.upsell.perksLabel")}
            </div>
            <ul>
              {Array.from({ length: cfg.perks }).map((_, i) => (
                <li key={i}>{t(`${root}.perks.${i}`)}</li>
              ))}
            </ul>
          </div>

          <div className="ins-upsell-launching">
            <span className="ins-upsell-launching__pill">
              {t("billing.upgrade.billedMonthly")}
            </span>
            <span>{t("billing.upgrade.cancelAnytime")}</span>
          </div>
        </div>

        <footer className="ins-upsell-foot">
          <button
            type="button"
            className="ins-upsell-btn ins-upsell-btn--primary"
            onClick={handleUpgrade}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("billing.upgrade.redirecting")}
              </>
            ) : (
              <>
                {t("billing.upgrade.cta", { price })}
                <ArrowRight size={14} />
              </>
            )}
          </button>
          <a
            href={mailtoHref}
            className="ins-upsell-btn ins-upsell-btn--secondary"
            target="_blank"
            rel="noreferrer"
          >
            <Mail size={14} />
            {t("supplier.insights.upsell.contactSales")}
          </a>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}