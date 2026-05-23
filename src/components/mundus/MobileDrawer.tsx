import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { XIcon, GlobeIcon, ChevronDownIcon } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import type { SidebarItem, SidebarEntry, SidebarSection } from "@/components/mundus/Sidebar";
import { ProBadge } from "@/components/mundus/ProBadge";

type Props = {
  open: boolean;
  onClose: () => void;
  items: SidebarEntry[];
  rolePill?: string;
  userName?: string;
  userSubtitle?: string;
  onProBadgeClick?: (item: SidebarItem) => void;
};

function isSection(e: SidebarEntry): e is SidebarSection {
  return (e as SidebarSection).type === "section";
}

function renderMdItem(
  item: SidebarItem,
  onClose: () => void,
  onProBadgeClick?: (i: SidebarItem) => void,
) {
  const I = item.icon;
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `md-item ${isActive ? "is-active" : ""} ${item.accent ? "is-accent" : ""}`.trim()
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
  );
}

function MdSection({
  section,
  onClose,
  onProBadgeClick,
}: {
  section: SidebarSection;
  onClose: () => void;
  onProBadgeClick?: (i: SidebarItem) => void;
}) {
  const { pathname } = useLocation();
  const hasActive = section.children.some((c) =>
    c.end ? pathname === c.to : pathname.startsWith(c.to),
  );
  const [open, setOpen] = useState<boolean>(section.defaultOpen ?? hasActive);
  const SI = section.icon;
  return (
    <div className={`md-section ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="md-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {SI && <SI size={20} />}
        <span className="md-section-label">{section.label}</span>
        <ChevronDownIcon size={18} />
      </button>
      {open && (
        <div className="md-section-body">
          {section.children.map((it) => renderMdItem(it, onClose, onProBadgeClick))}
        </div>
      )}
    </div>
  );
}

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
          {items.map((entry) => {
            if (isSection(entry)) {
              return (
                <MdSection
                  key={entry.key}
                  section={entry}
                  onClose={onClose}
                  onProBadgeClick={onProBadgeClick}
                />
              );
            }
            return (
              <div key={entry.to} className="md-item-wrap">
                {entry.groupLabel && (
                  <div className="md-group-label">{entry.groupLabel}</div>
                )}
                {renderMdItem(entry, onClose, onProBadgeClick)}
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