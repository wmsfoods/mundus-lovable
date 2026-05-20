import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Building, Package, MessagesSquare, ShieldCheck, AlertTriangle, Activity,
  Users, BarChart3, Beef, Globe, Ship, Coins, Percent, Users2, History, Flag,
  Search as SearchIcon, UserSearch, ClipboardList,
} from "lucide-react";
import { Sidebar, type SidebarItem } from "@/components/mundus/Sidebar";
import { Topbar } from "@/components/mundus/Topbar";
import { BottomNav, type BottomNavItem } from "@/components/mundus/BottomNav";
import { MobileDrawer } from "@/components/mundus/MobileDrawer";
import { StackHeader } from "@/components/mundus/StackHeader";
import { StackHeaderProvider } from "@/contexts/StackHeaderContext";
import { isStackRoute } from "@/lib/mobile-nav";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

type IconCmp = SidebarItem["icon"];

export default function AdminShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const isMobile = useIsMobileShell();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userName = user?.email?.split("@")[0] ?? "User";
  const stackMode = isMobile && isStackRoute(location.pathname);

  const ADMIN_NAV: SidebarItem[] = [
    { to: "/admin/dashboard", label: t("admin.shell.nav.dashboard"), icon: LayoutDashboard as unknown as IconCmp, groupLabel: t("admin.shell.nav.overview") },
    { to: "/admin/analytics", label: t("admin.shell.nav.analytics"), icon: Activity as unknown as IconCmp },

    { to: "/admin/companies", label: t("admin.shell.nav.companies"), icon: Building as unknown as IconCmp, groupLabel: t("admin.shell.nav.operations") },
    { to: "/admin/deals", label: t("admin.shell.nav.deals"), icon: Package as unknown as IconCmp },
    { to: "/admin/negotiations", label: t("admin.shell.nav.negotiations"), icon: MessagesSquare as unknown as IconCmp },
    { to: "/admin/verifications", label: t("admin.shell.nav.verifications"), icon: ShieldCheck as unknown as IconCmp, badge: 8 },
    { to: "/admin/disputes", label: t("admin.shell.nav.disputes"), icon: AlertTriangle as unknown as IconCmp, badge: 3 },

    { to: "/admin/crm/prospects", label: t("admin.shell.nav.prospects"), icon: Users as unknown as IconCmp, groupLabel: t("admin.shell.nav.crm") },
    { to: "/admin/crm/pipeline", label: t("admin.shell.nav.pipeline"), icon: BarChart3 as unknown as IconCmp },

    { to: "/admin/prospect/companies", label: "Find Companies", icon: SearchIcon as unknown as IconCmp, groupLabel: "PROSPECT" },
    { to: "/admin/prospect/people", label: "Find People", icon: UserSearch as unknown as IconCmp },
    { to: "/admin/prospect/lists", label: "Lists", icon: ClipboardList as unknown as IconCmp },

    { to: "/admin/marketplace/products", label: t("admin.shell.nav.products"), icon: Beef as unknown as IconCmp, groupLabel: t("admin.shell.nav.marketplace") },
    { to: "/admin/marketplace/markets", label: t("admin.shell.nav.markets"), icon: Globe as unknown as IconCmp },
    { to: "/admin/marketplace/ports", label: t("admin.shell.nav.ports"), icon: Ship as unknown as IconCmp },

    { to: "/admin/finance/revenue", label: t("admin.shell.nav.revenue"), icon: Coins as unknown as IconCmp, groupLabel: t("admin.shell.nav.finance") },
    { to: "/admin/finance/commissions", label: t("admin.shell.nav.commissions"), icon: Percent as unknown as IconCmp },

    { to: "/admin/settings/team", label: t("admin.shell.nav.team"), icon: Users2 as unknown as IconCmp, groupLabel: t("admin.shell.nav.settings") },
    { to: "/admin/settings/audit", label: t("admin.shell.nav.audit"), icon: History as unknown as IconCmp },
    { to: "/admin/settings/flags", label: t("admin.shell.nav.flags"), icon: Flag as unknown as IconCmp },
  ];

  const ADMIN_BOTTOM: BottomNavItem[] = [
    { to: "/admin/dashboard", label: t("admin.shell.nav.dashboard"), icon: LayoutDashboard as unknown as IconCmp },
    { to: "/admin/companies", label: t("admin.shell.nav.companies"), icon: Building as unknown as IconCmp },
    { to: "/admin/deals", label: t("admin.shell.nav.deals"), icon: Package as unknown as IconCmp, accent: true },
    { to: "/admin/crm/prospects", label: t("admin.shell.nav.prospects"), icon: Users as unknown as IconCmp },
    { to: "/admin/verifications", label: t("admin.shell.nav.verifications"), icon: ShieldCheck as unknown as IconCmp },
  ];

  return (
    <StackHeaderProvider>
      <div
        className={`app-shell ${isMobile ? "is-mobile" : ""} ${stackMode ? "is-stack" : ""}`.trim()}
      >
        <Sidebar
          items={ADMIN_NAV}
          rolePill={t("shell.admin")}
          userName={userName}
          userSubtitle={company?.name}
        />
        {stackMode ? <StackHeader /> : <Topbar onMenuClick={() => setDrawerOpen(true)} />}
        <main className="app-main">
          <Outlet />
        </main>
        {isMobile && !stackMode && <BottomNav items={ADMIN_BOTTOM} />}
        {isMobile && (
          <MobileDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            items={ADMIN_NAV}
            rolePill={t("shell.admin")}
            userName={userName}
            userSubtitle={company?.name}
          />
        )}
      </div>
    </StackHeaderProvider>
  );
}