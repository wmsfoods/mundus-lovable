import { useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { XIcon, GlobeIcon } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import type { SidebarItem } from "@/components/mundus/Sidebar";
import { ProBadge } from "@/components/mundus/ProBadge";

type Props = {
  open: boolean;
  onClose: () => void;
  items: SidebarItem[];
  rolePill?: string;
  userName?: string;
  userSubtitle?: string;
  onProBadgeClick?: (item: SidebarItem) => void;
};

export function MobileDrawer({
  open,
  onClose,
  items,
  rolePill,
  userName,
  userSubtitle,
  onProBadgeClick,
}: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();

  // Close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ESC + scroll lock
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

  const initials = userName
    ? userName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 1).toUpperCase() ?? "A";

  return createPortal(
    <div className={`md-root ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button
        type="button"
        className="md-overlay"
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
      />
      <aside
        className="md-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="md-header">
          <Logo size="sm" />
          <button
            type="button"
            className="md-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="md-user">
          <span className="md-user-av">{initials}</span>
          <div className="md-user-meta">
            <span className="md-user-name">{userName ?? user?.email}</span>
            {userSubtitle && (
              <span className="md-user-sub">{userSubtitle}</span>
            )}
            {rolePill && <span className="md-role-pill">{rolePill}</span>}
          </div>
        </div>

        <nav className="md-nav">
          {items.map((item) => {
            const I = item.icon;
            return (
              <div key={item.to} className="md-item-wrap">
                {item.groupLabel && (
                  <div className="md-group-label">{item.groupLabel}</div>
                )}
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `md-item ${isActive ? "is-active" : ""} ${
                      item.accent ? "is-accent" : ""
                    }`.trim()
                  }
                  onClick={onClose}
                >
                  <I size={20} />
                  <span>{item.label}</span>
                  {item.proBadge && (
                    <ProBadge
                      onClick={
                        onProBadgeClick
                          ? () => {
                              onClose();
                              onProBadgeClick(item);
                            }
                          : undefined
                      }
                    />
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="md-footer">
          <div className="md-section-label">
            <GlobeIcon size={14} />
            <span>{t("common.language", { defaultValue: "Language" })}</span>
          </div>
          <div className="md-lang-row">
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => i18n.changeLanguage(l.code)}
                className={`md-lang-btn ${
                  i18n.resolvedLanguage === l.code ? "is-active" : ""
                }`}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}