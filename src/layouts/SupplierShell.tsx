import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, type SidebarItem } from "@/components/mundus/Sidebar";
import { Topbar } from "@/components/mundus/Topbar";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import {
  HomeIcon,
  TagIcon,
  PlusIcon,
  FileTextIcon,
  MessageIcon,
  ClipboardIcon,
  UsersIcon,
} from "@/components/icons";

export default function SupplierShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const userName = user?.email?.split("@")[0] ?? "User";

  const SUPPLIER_NAV: SidebarItem[] = [
    { to: "/supplier", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/supplier/offers", label: t("shell.nav.myOffers"), icon: TagIcon },
    { to: "/supplier/offers/new", label: t("shell.nav.createOffer"), icon: PlusIcon, accent: true },
    { to: "/supplier/sales", label: t("shell.nav.sales"), icon: FileTextIcon },
    { to: "/supplier/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon },
    { to: "/supplier/requests", label: t("shell.nav.offerRequests"), icon: ClipboardIcon },
    { to: "/supplier/users", label: t("shell.nav.users"), icon: UsersIcon },
  ];

  return (
    <div className="app-shell">
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
    </div>
  );
}