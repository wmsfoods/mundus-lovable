import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Building, Package, MessagesSquare, ShieldCheck, AlertTriangle,
  Users, BarChart3, Beef, Globe, Ship, Coins, Percent, Users2, History, Flag,
  Search, Bell, HelpCircle, type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/contexts/ThemeContext";
import { Logo } from "@/components/Logo";

// TODO: gate to admin role only

type NavItem = { to: string; labelKey: string; icon: LucideIcon; badge?: number };
type NavGroup = { labelKey: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { labelKey: "admin.shell.nav.overview", items: [
    { to: "/admin/dashboard", labelKey: "admin.shell.nav.dashboard", icon: LayoutDashboard },
  ]},
  { labelKey: "admin.shell.nav.operations", items: [
    { to: "/admin/companies", labelKey: "admin.shell.nav.companies", icon: Building },
    { to: "/admin/deals", labelKey: "admin.shell.nav.deals", icon: Package },
    { to: "/admin/negotiations", labelKey: "admin.shell.nav.negotiations", icon: MessagesSquare },
    { to: "/admin/verifications", labelKey: "admin.shell.nav.verifications", icon: ShieldCheck, badge: 8 },
    { to: "/admin/disputes", labelKey: "admin.shell.nav.disputes", icon: AlertTriangle, badge: 3 },
  ]},
  { labelKey: "admin.shell.nav.crm", items: [
    { to: "/admin/crm/prospects", labelKey: "admin.shell.nav.prospects", icon: Users },
    { to: "/admin/crm/pipeline", labelKey: "admin.shell.nav.pipeline", icon: BarChart3 },
  ]},
  { labelKey: "admin.shell.nav.marketplace", items: [
    { to: "/admin/marketplace/products", labelKey: "admin.shell.nav.products", icon: Beef },
    { to: "/admin/marketplace/markets", labelKey: "admin.shell.nav.markets", icon: Globe },
    { to: "/admin/marketplace/ports", labelKey: "admin.shell.nav.ports", icon: Ship },
  ]},
  { labelKey: "admin.shell.nav.finance", items: [
    { to: "/admin/finance/revenue", labelKey: "admin.shell.nav.revenue", icon: Coins },
    { to: "/admin/finance/commissions", labelKey: "admin.shell.nav.commissions", icon: Percent },
  ]},
  { labelKey: "admin.shell.nav.settings", items: [
    { to: "/admin/settings/team", labelKey: "admin.shell.nav.team", icon: Users2 },
    { to: "/admin/settings/audit", labelKey: "admin.shell.nav.audit", icon: History },
    { to: "/admin/settings/flags", labelKey: "admin.shell.nav.flags", icon: Flag },
  ]},
];

export default function AdminShell() {
  const { t } = useTranslation();
  return (
    <div className="adm-app">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <Logo size="sm" />
          <span className="adm-brand-text">{t("admin.shell.brand")}</span>
        </div>
        <nav className="adm-nav">
          {GROUPS.map((g) => (
            <div key={g.labelKey} className="adm-nav-group">
              <div className="adm-nav-label">{t(g.labelKey)}</div>
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end
                    className={({ isActive }) => `adm-nav-item ${isActive ? "is-active" : ""}`}
                  >
                    <Icon size={14} />
                    <span className="adm-nav-item-label">{t(it.labelKey)}</span>
                    {it.badge ? <span className="adm-nav-badge">{it.badge}</span> : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="adm-user">
          <span className="adm-user-av">FN</span>
          <div className="adm-user-meta">
            <span className="adm-user-name">{t("admin.shell.user.name")}</span>
            <span className="adm-user-role">{t("admin.shell.user.role")}</span>
          </div>
        </div>
      </aside>
      <div className="adm-main">
        <div className="adm-topbar">
          <div className="adm-search">
            <Search size={14} />
            <input type="text" placeholder={t("admin.shell.search")} disabled />
            <span className="adm-kbd">⌘K</span>
          </div>
          <div className="adm-topbar-spacer" />
          <ThemeToggle />
          <button type="button" className="adm-icon-btn" aria-label="Notifications"><Bell size={16} /></button>
          <button type="button" className="adm-icon-btn" aria-label="Help"><HelpCircle size={16} /></button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}