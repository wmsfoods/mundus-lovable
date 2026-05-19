import { useState } from "react";
import { Sparkles, X, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useInsightsUpsell } from "@/contexts/InsightsUpsellContext";
import type { UpsellFeature } from "@/components/supplier/InsightsUpsellPanel";

export function PreviewBanner({ feature }: { feature?: UpsellFeature }) {
  const { t } = useTranslation();
  const { openUpsell } = useInsightsUpsell();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="ins-preview-banner" role="note">
      <Sparkles size={16} className="ins-preview-banner__icon" />
      <span className="ins-preview-banner__title">
        {t("supplier.insights.previewBanner.title")}
      </span>
      <span className="ins-preview-banner__body">
        {t("supplier.insights.previewBanner.body")}
      </span>
      {feature && (
        <button
          type="button"
          className="ins-preview-banner__cta"
          onClick={() => openUpsell(feature)}
        >
          {t("supplier.insights.upsell.learnMore")}
          <ArrowUpRight size={13} />
        </button>
      )}
      <button
        type="button"
        className="ins-preview-banner__close"
        onClick={() => setOpen(false)}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}