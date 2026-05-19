import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export type UpsellFeature = "price-benchmark" | "analytics";

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
  | "sla";

const FEATURES: Record<
  UpsellFeature,
  { bullets: { key: BulletKey; icon: LucideIcon }[]; perks: number; salesSubject: string }
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
  },
};

export function InsightsUpsellPanel({ open, feature, onClose }: Props) {
  const { t } = useTranslation();

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
  const root = `supplier.insights.upsell.${feature === "price-benchmark" ? "priceBenchmark" : "analytics"}` as const;

  const handleEarlyAccess = () => {
    toast.success(t("supplier.insights.upsell.earlyAccessToast"));
    onClose();
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
              {t("supplier.insights.upsell.launching")}
            </span>
            <span>{t("supplier.insights.upsell.pricing")}</span>
          </div>
        </div>

        <footer className="ins-upsell-foot">
          <button
            type="button"
            className="ins-upsell-btn ins-upsell-btn--primary"
            onClick={handleEarlyAccess}
          >
            {t("supplier.insights.upsell.earlyAccess")}
            <ArrowRight size={14} />
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