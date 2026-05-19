import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, type SidebarItem } from "@/components/mundus/Sidebar";
import { Topbar } from "@/components/mundus/Topbar";
import { BottomNav, type BottomNavItem } from "@/components/mundus/BottomNav";
import { MobileDrawer } from "@/components/mundus/MobileDrawer";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import {
  HomeIcon,
  UsersIcon,
  ClipboardIcon,
  PlusIcon,
  TagIcon,
  FileTextIcon,
  MessageIcon,
  MoreVerticalIcon,
} from "@/components/icons";

export default function BuyerShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const isMobile = useIsMobileShell();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userName = user?.email?.split("@")[0] ?? "User";

  const BUYER_NAV: SidebarItem[] = [
    { to: "/buyer", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/buyer/requests", label: t("shell.nav.requests"), icon: ClipboardIcon },
    { to: "/buyer/requests/new", label: t("shell.nav.createRequest"), icon: PlusIcon, accent: true },
    { to: "/buyer/offers", label: t("shell.nav.offers"), icon: TagIcon },
    { to: "/buyer/orders", label: t("shell.nav.orders"), icon: FileTextIcon },
    { to: "/buyer/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon },
    { to: "/buyer/chat", label: t("shell.nav.messages"), icon: MessageIcon },
    { to: "/buyer/users", label: t("shell.nav.users"), icon: UsersIcon },
  ];

  const BUYER_BOTTOM: BottomNavItem[] = [
    { to: "/buyer", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/buyer/offers", label: t("shell.nav.offers"), icon: TagIcon },
    { to: "/buyer/requests/new", label: t("shell.bottom.create", { defaultValue: "Create" }), icon: PlusIcon, accent: true },
    { to: "/buyer/negotiations", label: t("shell.bottom.negotiations", { defaultValue: "Chat" }), icon: MessageIcon },
    { label: t("shell.more"), icon: MoreVerticalIcon, onClick: () => setDrawerOpen(true) },
  ];

  return (
    <div className={`app-shell ${isMobile ? "is-mobile" : ""}`.trim()}>
      <Sidebar
        items={BUYER_NAV}
        userName={userName}
        userSubtitle={company?.name}
      />
      <Topbar />
      <main className="app-main">
        <Outlet />
      </main>
      {isMobile && <BottomNav items={BUYER_BOTTOM} />}
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
  );
}
