import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@/components/icons";
import { useStackHeaderConfig } from "@/contexts/StackHeaderContext";
import { backFallbackFor, defaultTitleKeyFor } from "@/lib/mobile-nav";

/**
 * Mobile-only header for stack screens.
 * Replaces the Topbar + BottomNav on internal/detail routes.
 */
export function StackHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { title, actions } = useStackHeaderConfig();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(backFallbackFor(location.pathname));
    }
  };

  const fallbackKey = defaultTitleKeyFor(location.pathname);
  const resolvedTitle =
    title ?? (fallbackKey ? t(fallbackKey, { defaultValue: "" }) : "");

  return (
    <header className="sh" role="banner">
      <button
        type="button"
        className="sh-back"
        onClick={handleBack}
        aria-label={t("shell.back", { defaultValue: "Back" })}
      >
        <ArrowLeftIcon size={22} />
      </button>
      <h1 className="sh-title" title={typeof resolvedTitle === "string" ? resolvedTitle : undefined}>
        {resolvedTitle}
      </h1>
      <div className="sh-actions">{actions}</div>
    </header>
  );
}