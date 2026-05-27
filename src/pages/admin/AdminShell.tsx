import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Building, Package, MessagesSquare, ShieldCheck, AlertTriangle, Activity,
  Users, BarChart3, Beef, Globe, Ship, Coins, Percent, Users2, History, Flag, Mail, Megaphone, FileText, AtSign, MessageCircle, RefreshCw,
  Search as SearchIcon, UserSearch, ClipboardList, UserCheck,
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
import { supabase } from "@/integrations/supabase/client";

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
  const [pendingUserRequests, setPendingUserRequests] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("user_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (!cancelled) setPendingUserRequests(count ?? 0);
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const ADMIN_NAV: SidebarItem[] = [
    { to: "/admin/dashboard", label: t("admin.shell.nav.dashboard"), icon: LayoutDashboard as unknown as IconCmp, groupLabel: t("admin.shell.nav.overview") },
    { to: "/admin/analytics", label: t("admin.shell.nav.analytics"), icon: Activity as unknown as IconCmp },

    { to: "/admin/companies", label: t("admin.shell.nav.companies"), icon: Building as unknown as IconCmp, groupLabel: t("admin.shell.nav.operations") },
    { to: "/admin/user-requests", label: "User Requests", icon: UserCheck as unknown as IconCmp, badge: pendingUserRequests || undefined },
    { to: "/admin/offers", label: "All Offers", icon: Package as unknown as IconCmp },
    { to: "/admin/deals", label: t("admin.shell.nav.deals"), icon: Package as unknown as IconCmp },
    { to: "/admin/negotiations", label: t("admin.shell.nav.negotiations"), icon: MessagesSquare as unknown as IconCmp },
    { to: "/admin/verifications", label: t("admin.shell.nav.verifications"), icon: ShieldCheck as unknown as IconCmp, badge: 8 },
    { to: "/admin/disputes", label: t("admin.shell.nav.disputes"), icon: AlertTriangle as unknown as IconCmp, badge: 3 },

    { to: "/admin/crm/prospects", label: t("admin.shell.nav.prospects"), icon: Users as unknown as IconCmp, groupLabel: t("admin.shell.nav.crm") },
    { to: "/admin/crm/pipeline", label: t("admin.shell.nav.pipeline"), icon: BarChart3 as unknown as IconCmp },

    { to: "/admin/prospect/companies", label: t("admin.shell.nav.find_companies"), icon: SearchIcon as unknown as IconCmp, groupLabel: t("admin.shell.nav.prospecting") },
    { to: "/admin/prospect/people", label: t("admin.shell.nav.find_people"), icon: UserSearch as unknown as IconCmp },
    { to: "/admin/prospect/lists", label: t("admin.shell.nav.lists"), icon: ClipboardList as unknown as IconCmp },

    { to: "/admin/marketplace/products", label: t("admin.shell.nav.products"), icon: Beef as unknown as IconCmp, groupLabel: t("admin.shell.nav.marketplace") },
    { to: "/admin/marketplace/markets", label: t("admin.shell.nav.markets"), icon: Globe as unknown as IconCmp },
    { to: "/admin/marketplace/ports", label: t("admin.shell.nav.ports"), icon: Ship as unknown as IconCmp },

    { to: "/admin/outreach", label: t("admin.outreach.nav.center", "Outreach Center"), icon: Mail as unknown as IconCmp, groupLabel: t("admin.outreach.nav.group", "Outreach") },
    { to: "/admin/outreach/campaigns", label: t("admin.outreach.nav.campaigns", "Campaigns"), icon: Megaphone as unknown as IconCmp },
    { to: "/admin/outreach/templates", label: t("admin.outreach.nav.templates", "Templates"), icon: FileText as unknown as IconCmp },
    { to: "/admin/settings/email", label: t("admin.outreach.nav.email_settings", "Email Settings"), icon: AtSign as unknown as IconCmp },

    { to: "/admin/finance/revenue", label: t("admin.shell.nav.revenue"), icon: Coins as unknown as IconCmp, groupLabel: t("admin.shell.nav.finance") },
    { to: "/admin/whats/conversas", label: "Mundus Whats", icon: MessageCircle as unknown as IconCmp, groupLabel: "COMMUNICATION" },

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