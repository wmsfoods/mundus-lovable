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
  TagIcon,
  PlusIcon,
  FileTextIcon,
  MessageIcon,
  ClipboardIcon,
  UsersIcon,
  MoreVerticalIcon,
} from "@/components/icons";

export default function SupplierShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const isMobile = useIsMobileShell();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userName = user?.email?.split("@")[0] ?? "User";

  const SUPPLIER_NAV: SidebarItem[] = [
    { to: "/supplier", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/supplier/offers", label: t("shell.nav.myOffers"), icon: TagIcon },
    { to: "/supplier/offers/new", label: t("shell.nav.createOffer"), icon: PlusIcon, accent: true },
    { to: "/supplier/sales", label: t("shell.nav.sales"), icon: FileTextIcon },
    { to: "/supplier/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon, badge: 3 },
    { to: "/supplier/requests", label: t("shell.nav.offerRequests"), icon: ClipboardIcon, badge: 10 },
    { to: "/supplier/users", label: t("shell.nav.users"), icon: UsersIcon },
    { to: "/supplier/company", label: t("shell.nav.myCompany"), icon: HomeIcon },
  ];

  const SUPPLIER_BOTTOM: BottomNavItem[] = [
    { to: "/supplier", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/supplier/offers", label: t("shell.nav.myOffers"), icon: TagIcon },
    { to: "/supplier/offers/new", label: t("shell.bottom.create", { defaultValue: "Create" }), icon: PlusIcon, accent: true },
    { to: "/supplier/negotiations", label: t("shell.bottom.negotiations", { defaultValue: "Chat" }), icon: MessageIcon },
    { label: t("shell.more"), icon: MoreVerticalIcon, onClick: () => setDrawerOpen(true) },
  ];

  return (
    <div className={`app-shell ${isMobile ? "is-mobile" : ""}`.trim()}>
      <Sidebar
        items={SUPPLIER_NAV}
        rolePill={t("shell.supplier")}
        userName={userName}
        userSubtitle={company?.name}
      />
      <Topbar />
      <main className="app-main">
        <Outlet />
      </main>
      {isMobile && <BottomNav items={SUPPLIER_BOTTOM} />}
      {isMobile && (
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          items={SUPPLIER_NAV}
          rolePill={t("shell.supplier")}
          userName={userName}
          userSubtitle={company?.name}
        />
      )}
    </div>
  );
}
