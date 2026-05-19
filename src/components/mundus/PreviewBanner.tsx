import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PreviewBanner() {
  const { t } = useTranslation();
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