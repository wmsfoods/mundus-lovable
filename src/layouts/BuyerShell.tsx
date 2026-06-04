import { useState } from "react";
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
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { BUYER_CHAT_TOTAL_UNREAD } from "@/hooks/useBuyerChat";
import {
  HomeIcon,
  UsersIcon,
  ClipboardIcon,
  PlusIcon,
  TagIcon,
  FileTextIcon,
  MessageIcon,
} from "@/components/icons";
import { BarChart3, ShoppingBag, Settings2 } from "lucide-react";
import { Globe } from "lucide-react";
import { InsightsUpsellProvider } from "@/contexts/InsightsUpsellContext";
export default function BuyerShell() {
  return (
    <InsightsUpsellProvider>
      <BuyerShellInner />
    </InsightsUpsellProvider>
  );
}

function BuyerShellInner() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const isMobile = useIsMobileShell();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userName = user?.email?.split("@")[0] ?? "User";
  const stackMode = isMobile && isStackRoute(location.pathname);

  const BUYER_NAV: SidebarEntry[] = [
    { to: "/buyer", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    {
      type: "section",
      key: "marketplace",
      label: t("shell.nav.marketplace"),
      icon: ShoppingBag as unknown as SidebarItem["icon"],
      children: [
        { to: "/buyer/offers", label: t("shell.nav.offers"), icon: TagIcon },
        { to: "/buyer/requests/new", label: t("shell.nav.createRequest"), icon: PlusIcon, accent: true },
        { to: "/buyer/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon },
        { to: "/buyer/requests", label: t("shell.nav.requests"), icon: ClipboardIcon },
        { to: "/buyer/chat", label: t("shell.nav.chat"), icon: MessageIcon, badge: BUYER_CHAT_TOTAL_UNREAD || undefined },
      ],
    },
    {
      type: "section",
      key: "operations",
      label: t("shell.nav.operations"),
      icon: Settings2 as unknown as SidebarItem["icon"],
      children: [
        { to: "/buyer/orders", label: t("shell.nav.orders"), icon: FileTextIcon },
      ],
    },
    {
      to: "/buyer/procurement-intelligence",
      label: t("buyer.procurement.nav", { defaultValue: "Procurement Intelligence" }),
      icon: BarChart3 as unknown as SidebarItem["icon"],
      proBadge: true,
      groupLabel: t("shell.nav.mundusIntel"),
    },
    {
      to: "https://market-us.mundustrade.com",
      label: t("shell.nav.marketIntelligence"),
      icon: Globe as unknown as SidebarItem["icon"],
      external: true,
      proBadge: true,
    },
    {
      type: "section",
      key: "admin",
      label: t("shell.nav.admin"),
      icon: UsersIcon as unknown as SidebarItem["icon"],
      children: [
        { to: "/buyer/company", label: t("shell.nav.myCompany", { defaultValue: "My Company" }), icon: HomeIcon },
        { to: "/buyer/users", label: t("shell.nav.users", { defaultValue: "Users" }), icon: UsersIcon },
      ],
    },
  ];

  const BUYER_BOTTOM: BottomNavItem[] = [
    { to: "/buyer", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/buyer/offers", label: t("shell.nav.offers"), icon: TagIcon },
    { to: "/buyer/requests/new", label: t("shell.bottom.create", { defaultValue: "Create" }), icon: PlusIcon, accent: true },
    { to: "/buyer/chat", label: t("shell.bottom.negotiations", { defaultValue: "Chat" }), icon: MessageIcon },
    { to: "/buyer/orders", label: t("shell.nav.orders"), icon: FileTextIcon },
  ];

  return (
    <StackHeaderProvider>
      <div
        className={`app-shell ${isMobile ? "is-mobile" : ""} ${stackMode ? "is-stack" : ""}`.trim()}
      >
        <Sidebar
          items={BUYER_NAV}
          rolePill={t("shell.buyer")}
          userName={userName}
          userSubtitle={company?.name}
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
        {isMobile && !stackMode && <BottomNav items={BUYER_BOTTOM} />}
        {isMobile && (
          <MobileDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            items={BUYER_NAV}
            rolePill={t("shell.buyer")}
            userName={userName}
            userSubtitle={company?.name}
          />
        )}
      </div>
    </StackHeaderProvider>
  );
}
