import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import {
  HomeIcon,
  TagIcon,
  PlusIcon,
  FileTextIcon,
  MessageIcon,
  ClipboardIcon,
  UsersIcon,
} from "@/components/icons";
import { BarChart3, LineChart, Mail } from "lucide-react";
import { InsightsUpsellProvider, useInsightsUpsell } from "@/contexts/InsightsUpsellContext";
import type { UpsellFeature } from "@/components/supplier/InsightsUpsellPanel";

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
  const userName = user?.email?.split("@")[0] ?? "User";
  const { openUpsell } = useInsightsUpsell();
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

  const SUPPLIER_NAV: SidebarItem[] = [
    { to: "/supplier", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/supplier/offers", label: t("shell.nav.myOffers"), icon: TagIcon },
    { to: "/supplier/offers/new", label: t("shell.nav.createOffer"), icon: PlusIcon, accent: true },
    { to: "/supplier/sales", label: t("shell.nav.sales"), icon: FileTextIcon },
    {
      to: "/supplier/insights/price-benchmark",
      label: t("supplier.insights.nav.priceBenchmark"),
      icon: BarChart3 as unknown as SidebarItem["icon"],
      proBadge: true,
      groupLabel: t("supplier.insights.groupLabel"),
    },
    {
      to: "/supplier/insights/analytics",
      label: t("supplier.insights.nav.analytics"),
      icon: LineChart as unknown as SidebarItem["icon"],
      proBadge: true,
    },
    { to: "/supplier/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon, badge: 3 },
    { to: "/supplier/requests", label: t("shell.nav.offerRequests"), icon: ClipboardIcon, badge: 10 },
    { to: "/supplier/outreach", label: t("supplier.outreach.navLabel"), icon: Mail as unknown as SidebarItem["icon"] },
    { to: "/supplier/users", label: t("shell.nav.users"), icon: UsersIcon },
    { to: "/supplier/company", label: t("shell.nav.myCompany"), icon: HomeIcon },
  ];

  const SUPPLIER_BOTTOM: BottomNavItem[] = [
    { to: "/supplier", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/supplier/offers", label: t("shell.nav.myOffers"), icon: TagIcon },
    { to: "/supplier/offers/new", label: t("shell.bottom.create", { defaultValue: "Create" }), icon: PlusIcon, accent: true },
    { to: "/supplier/negotiations", label: t("shell.bottom.negotiations", { defaultValue: "Chat" }), icon: MessageIcon },
    { to: "/supplier/sales", label: t("shell.nav.sales"), icon: FileTextIcon },
  ];

  return (
    <StackHeaderProvider>
      <div
        className={`app-shell ${isMobile ? "is-mobile" : ""} ${stackMode ? "is-stack" : ""}`.trim()}
      >
        <Sidebar
          items={SUPPLIER_NAV}
          rolePill={t("shell.supplier")}
          userName={userName}
          userSubtitle={company?.name}
          onProBadgeClick={onProBadgeClick}
        />
        {stackMode ? <StackHeader /> : <Topbar onMenuClick={() => setDrawerOpen(true)} />}
        <main className="app-main">
          <Outlet />
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
