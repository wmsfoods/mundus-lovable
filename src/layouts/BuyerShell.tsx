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
import { BarChart3 } from "lucide-react";

export default function BuyerShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const isMobile = useIsMobileShell();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userName = user?.email?.split("@")[0] ?? "User";
  const stackMode = isMobile && isStackRoute(location.pathname);

  const BUYER_NAV: SidebarItem[] = [
    { to: "/buyer", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/buyer/requests", label: t("shell.nav.requests"), icon: ClipboardIcon },
    { to: "/buyer/requests/new", label: t("shell.nav.createRequest"), icon: PlusIcon, accent: true },
    { to: "/buyer/offers", label: t("shell.nav.offers"), icon: TagIcon },
    { to: "/buyer/orders", label: t("shell.nav.orders"), icon: FileTextIcon },
    { to: "/buyer/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon },
    { to: "/buyer/chat", label: t("shell.nav.chat"), icon: MessageIcon, badge: BUYER_CHAT_TOTAL_UNREAD || undefined },
    { to: "/buyer/users", label: t("shell.nav.users"), icon: UsersIcon },
    {
      to: "/buyer/procurement-intelligence",
      label: t("buyer.procurement.nav", { defaultValue: "Procurement Intelligence" }),
      icon: BarChart3 as unknown as SidebarItem["icon"],
      proBadge: true,
      groupLabel: t("buyer.procurement.groupLabel", { defaultValue: "Insights" }),
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
          userName={userName}
          userSubtitle={company?.name}
        />
        {stackMode ? <StackHeader /> : <Topbar onMenuClick={() => setDrawerOpen(true)} />}
        <main className="app-main">
          <Outlet />
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
