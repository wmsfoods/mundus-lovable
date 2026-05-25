import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { XIcon, ChevronDownIcon } from "@/components/icons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProBadge } from "@/components/mundus/ProBadge";

export type SidebarItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  accent?: boolean;
  badge?: number;
  end?: boolean;
  groupLabel?: string;
  proBadge?: boolean;
  newBadge?: boolean;
};

export type SidebarSection = {
  type: "section";
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  defaultOpen?: boolean;
  children: SidebarItem[];
};

export type SidebarEntry = SidebarItem | SidebarSection;

function isSection(e: SidebarEntry): e is SidebarSection {
  return (e as SidebarSection).type === "section";
}

type SidebarProps = {
  items: SidebarEntry[];
  rolePill?: string;
  userName?: string;
  userSubtitle?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
  onProBadgeClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

function renderItem(
  item: SidebarItem,
  onClose: (() => void) | undefined,
  onProBadgeClick: ((i: SidebarItem) => void) | undefined,
) {
  const I = item.icon;
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onClose}
      title={item.label}
      className={({ isActive }) =>
        `sb-item ${isActive ? "is-active" : ""} ${item.accent ? "is-accent" : ""}`.trim()
      }
    >
      <I size={18} />
      <span className="sb-item-label">{item.label}</span>
      {item.proBadge && (
        <ProBadge
          onClick={onProBadgeClick ? () => onProBadgeClick(item) : undefined}
          title={onProBadgeClick ? "Preview premium" : undefined}
        />
      )}
      {item.newBadge && <span className="nav-new-badge">NEW</span>}
      {item.badge ? <span className="sb-item-badge">{item.badge}</span> : null}
    </NavLink>
  );
}

function SectionGroup({
  section,
  onClose,
  onProBadgeClick,
}: {
  section: SidebarSection;
  onClose?: () => void;
  onProBadgeClick?: (i: SidebarItem) => void;
}) {
  const { pathname } = useLocation();
  const hasActive = section.children.some((c) =>
    c.end ? pathname === c.to : pathname.startsWith(c.to),
  );
  const [open, setOpen] = useState<boolean>(
    section.defaultOpen ?? hasActive,
  );
  const SI = section.icon;
  return (
    <div className={`sb-section ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="sb-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={section.label}
      >
        {SI && <SI size={18} />}
        <span className="sb-section-label">{section.label}</span>
        <ChevronDownIcon size={16} />
      </button>
      {open && (
        <div className="sb-section-body">
          {section.children.map((it) => renderItem(it, onClose, onProBadgeClick))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  items,
  rolePill,
  userName,
  userSubtitle,
  mobileOpen = false,
  onClose,
  onProBadgeClick,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <>
      <div
        className={`sb-backdrop ${mobileOpen ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sb ${mobileOpen ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`.trim()}>
        <div className="sb-logo">
          {collapsed ? (
            <span className="sb-monogram" aria-label="Mundus">M</span>
          ) : (
            <Logo />
          )}
          {rolePill && !collapsed && <span className="sb-role-pill">{rolePill}</span>}
          {onToggleCollapsed && (
            <button
              type="button"
              className="sb-collapse-toggle"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
          <button
            type="button"
            className="sb-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <XIcon size={20} />
          </button>
        </div>
        <nav className="sb-nav">
          {items.map((entry) => {
            if (isSection(entry)) {
              return (
                <SectionGroup
                  key={entry.key}
                  section={entry}
                  onClose={onClose}
                  onProBadgeClick={onProBadgeClick}
                />
              );
            }
            return (
              <div key={entry.to} className="sb-item-wrap">
                {entry.groupLabel && (
                  <div className="sb-group-label">{entry.groupLabel}</div>
                )}
                {renderItem(entry, onClose, onProBadgeClick)}
              </div>
            );
          })}
        </nav>
        {userName && (
          <div className="sb-user">
            <span className="sb-user-av">{initials}</span>
            <div className="sb-user-meta">
              <span className="sb-user-name">{userName}</span>
              {userSubtitle && <span className="sb-user-sub">{userSubtitle}</span>}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
