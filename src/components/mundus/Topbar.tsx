import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  GlobeIcon,
  ChevronDownIcon,
} from "@/components/icons";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { supplierNotifications, buyerNotifications } from "@/data/mockNotifications";
import { Menu as MenuIcon, Bell as BellLucide } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { Logo } from "@/components/Logo";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { OfficeSwitcher } from "./OfficeSwitcher";

type TopbarProps = {
  onMenuClick?: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps = {}) {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobileShell();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement | null>(null);
  const { unit, toggle: toggleUnit } = useWeightUnit();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goToProfile = () => {
    const target = location.pathname.startsWith("/supplier")
      ? "/supplier/profile"
      : "/buyer/profile";
    navigate(target);
  };

  const initials = user?.email
    ? user.email.slice(0, 1).toUpperCase()
    : "A";

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ??
    SUPPORTED_LANGUAGES[0];

  const isSupplierPath = location.pathname.startsWith("/supplier");
  const notifList = isSupplierPath ? supplierNotifications : buyerNotifications;
  const notifUnreadCount = notifList.filter((n) => n.unread).length;
  const goToNotifications = () =>
    navigate(isSupplierPath ? "/supplier/notifications" : "/buyer/notifications");

  return (
    <div className={`tb ${isMobile ? "tb-mobile" : ""}`.trim()}>
      {isMobile && (
        <>
          <button
            type="button"
            className="tb-hamburger"
            onClick={onMenuClick}
            aria-label={t("shell.openMenu", { defaultValue: "Open menu" })}
          >
            <MenuIcon size={22} />
          </button>
          <div className="tb-brand-center">
            <Logo size="sm" />
          </div>
        </>
      )}
      {!isMobile && company?.name && (
        <div className="tb-posting-as">
          <span className="dot" aria-hidden="true" />
          <span className="tb-posting-name">{company.name}</span>
        </div>
      )}
      {!isMobile && <div className="tb-spacer" />}
      <OfficeSwitcher />
      {!isMobile && <div ref={langRef} style={{ position: "relative" }}>
        <button
          className="tb-item"
          type="button"
          onClick={() => setLangOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={langOpen}
        >
          <GlobeIcon size={16} />
          {isMobile ? currentLang.code.toUpperCase() : currentLang.label}
          <ChevronDownIcon size={14} />
        </button>
        {langOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 8,
              background: "#fff",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-hover)",
              minWidth: 160,
              padding: 6,
              zIndex: 50,
            }}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(l.code);
                  setLangOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  background:
                    l.code === currentLang.code ? "#f5f5f5" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--fs-sm)",
                  color: "var(--fg)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>}
      {!isMobile && <div className="tb-divider" />}
      {!isMobile && (
        <button
          className="tb-item"
          type="button"
          onClick={toggleUnit}
          aria-label={t("shell.unitToggle", { defaultValue: "Toggle weight unit" })}
          title={t("shell.unitToggle", { defaultValue: "Toggle weight unit" })}
          style={{ gap: 6 }}
        >
          <span style={{ fontWeight: unit === "kg" ? 700 : 400, opacity: unit === "kg" ? 1 : 0.55 }}>kg</span>
          <span style={{ opacity: 0.4 }}>↔</span>
          <span style={{ fontWeight: unit === "lbs" ? 700 : 400, opacity: unit === "lbs" ? 1 : 0.55 }}>lbs</span>
        </button>
      )}
      {isMobile ? (
        <button
          type="button"
          className="tb-bell"
          onClick={goToNotifications}
          aria-label={t("shell.notifications", { defaultValue: "Notifications" })}
        >
          <BellLucide size={18} />
          {notifUnreadCount > 0 && (
            <span
              className="dot"
              style={{
                width: 16,
                height: 16,
                top: 4,
                right: 4,
                background: "#dc2626",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {notifUnreadCount > 9 ? "9+" : notifUnreadCount}
            </span>
          )}
        </button>
      ) : (
        <NotificationDropdown
          notifications={notifList}
          ariaLabel={t("shell.notifications")}
        />
      )}
      <button
        className="tb-avatar"
        type="button"
        onClick={goToProfile}
        aria-label={t("shell.nav.profile", { defaultValue: "Profile" })}
      >
        <span className="av">{initials}</span>
      </button>
    </div>
  );
}
