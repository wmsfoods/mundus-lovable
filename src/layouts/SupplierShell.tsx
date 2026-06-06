import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, type SidebarItem, type SidebarEntry } from "@/components/mundus/Sidebar";
import { Topbar } from "@/components/mundus/Topbar";
import { BottomNav, type BottomNavItem } from "@/components/mundus/BottomNav";
import { MobileDrawer } from "@/components/mundus/MobileDrawer";
import { StackHeader } from "@/components/mundus/StackHeader";
import { PullToRefresh } from "@/components/mundus/PullToRefresh";
import { StackHeaderProvider } from "@/contexts/StackHeaderContext";
import { isStackRoute } from "@/lib/mobile-nav";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFullName } from "@/hooks/useUserFullName";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import {
  HomeIcon,
  TagIcon,
  PlusIcon,
  FileTextIcon,
  MessageIcon,
  ClipboardIcon,
  UsersIcon,
} from "@/components/icons";
import { BarChart3, LineChart, ShoppingBag, Settings2 } from "lucide-react";
import { Gavel, Globe } from "lucide-react";
import { InsightsUpsellProvider, useInsightsUpsell } from "@/contexts/InsightsUpsellContext";
import type { UpsellFeature } from "@/components/supplier/InsightsUpsellPanel";
import { useActiveOffice } from "@/hooks/useActiveOffice";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
export default function SupplierShell() {
  return (
    <InsightsUpsellProvider>
      <SupplierShellInner />
    </InsightsUpsellProvider>
  );
}

function SupplierShellInner() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const isMobile = useIsMobileShell();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarManual, setSidebarManual] = useState<boolean | null>(null);
  const sidebarCollapsed = !isMobile && (sidebarManual ?? false);
  useEffect(() => { setSidebarManual(null); }, [location.pathname]);
  const { fullName } = useUserFullName();
  const userName = fullName || (user?.email?.split("@")[0] ?? "User");
  const { openUpsell } = useInsightsUpsell();
  const { isGlobalDirector } = useActiveOffice();
  const { isAdmin: isMundusAdmin } = useIsMundusAdmin();
  const showDirectorTools = isGlobalDirector || isMundusAdmin;
  const stackMode = isMobile && isStackRoute(location.pathname);

  const featureForPath = (to: string): UpsellFeature | null => {
    if (to === "/supplier/insights/price-benchmark") return "price-benchmark";
    if (to === "/supplier/insights/analytics") return "analytics";
    return null;
  };

  const onProBadgeClick = (item: SidebarItem) => {
    const f = featureForPath(item.to);
    if (f) openUpsell(f);
  };

  const SUPPLIER_NAV: SidebarEntry[] = [
    { to: "/supplier", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/supplier/my-customers", label: t("shell.nav.myCustomers"), icon: UsersIcon },
    {
      type: "section",
      key: "marketplace",
      label: t("shell.nav.marketplace"),
      icon: ShoppingBag as unknown as SidebarItem["icon"],
      children: [
        { to: "/supplier/offers", label: t("shell.nav.myOffers"), icon: TagIcon },
        { to: "/supplier/auctions/create", label: t("shell.nav.createAuction"), icon: Gavel as unknown as SidebarItem["icon"], newBadge: true },
        { to: "/supplier/offers/new", label: t("shell.nav.createOffer"), icon: PlusIcon, accent: true },
        { to: "/supplier/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon },
        { to: "/supplier/requests", label: t("shell.nav.offerRequests"), icon: ClipboardIcon },
      ],
    },
    {
      type: "section",
      key: "operations",
      label: t("shell.nav.operations"),
      icon: Settings2 as unknown as SidebarItem["icon"],
      children: [
        { to: "/supplier/sales", label: t("shell.nav.sales"), icon: FileTextIcon },
      ],
    },
    {
      to: "/supplier/insights/price-benchmark",
      label: t("supplier.insights.nav.priceBenchmark"),
      icon: BarChart3 as unknown as SidebarItem["icon"],
      proBadge: true,
      groupLabel: t("shell.nav.mundusIntel"),
    },
    {
      to: "/supplier/insights/analytics",
      label: t("supplier.insights.nav.analytics"),
      icon: LineChart as unknown as SidebarItem["icon"],
      proBadge: true,
    },
    {
      to: "https://market-us.mundustrade.com",
      label: t("shell.nav.marketIntelligence"),
      icon: Globe as unknown as SidebarItem["icon"],
      external: true,
      proBadge: true,
    },
    ...(showDirectorTools ? [{
      to: "/supplier/insights/cut-comparison",
      label: t("supplier.insights.nav.cutComparison", { defaultValue: "Cut Comparison" }),
      icon: Globe as unknown as SidebarItem["icon"],
    }] : []),
    {
      type: "section",
      key: "admin",
      label: t("shell.nav.admin"),
      icon: UsersIcon as unknown as SidebarItem["icon"],
      children: [
        { to: "/supplier/company", label: t("shell.nav.myCompany"), icon: HomeIcon },
        { to: "/supplier/users", label: t("shell.nav.users", { defaultValue: "Users" }), icon: UsersIcon },
      ],
    },
  ];

  const SUPPLIER_BOTTOM: BottomNavItem[] = [
    { to: "/supplier", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/supplier/offers", label: t("shell.bottom.myOffers", { defaultValue: "Ofertas" }), icon: TagIcon },
    { to: "/supplier/offers/new", label: t("shell.bottom.create", { defaultValue: "Create" }), icon: PlusIcon, accent: true },
    { to: "/supplier/negotiations", label: t("shell.bottom.negotiations", { defaultValue: "Chat" }), icon: MessageIcon },
    { to: "/supplier/sales", label: t("shell.nav.sales"), icon: FileTextIcon },
  ];

  return (
    <StackHeaderProvider>
      <div
        className={`app-shell ${isMobile ? "is-mobile" : ""} ${stackMode ? "is-stack" : ""} ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`.trim()}
      >
        <Sidebar
          items={SUPPLIER_NAV}
          rolePill={t("shell.supplier")}
          userName={userName}
          userSubtitle={company?.name}
          onProBadgeClick={onProBadgeClick}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarManual(!sidebarCollapsed)}
        />
        {stackMode ? <StackHeader /> : <Topbar onMenuClick={() => setDrawerOpen(true)} />}
        <main className="app-main">
          {isMobile ? (
            <PullToRefresh>
              <Outlet />
            </PullToRefresh>
          ) : (
            <Outlet />
          )}
        </main>
        {isMobile && !stackMode && <BottomNav items={SUPPLIER_BOTTOM} />}
        {isMobile && (
          <MobileDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            items={SUPPLIER_NAV}
            rolePill={t("shell.supplier")}
            userName={userName}
            userSubtitle={company?.name}
            onProBadgeClick={onProBadgeClick}
          />
        )}
      </div>
    </StackHeaderProvider>
  );
}
