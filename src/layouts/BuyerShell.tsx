import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, type SidebarItem } from "@/components/mundus/Sidebar";
import { Topbar } from "@/components/mundus/Topbar";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import {
  HomeIcon,
  UsersIcon,
  ClipboardIcon,
  PlusIcon,
  TagIcon,
  FileTextIcon,
  MessageIcon,
} from "@/components/icons";

export default function BuyerShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { t } = useTranslation();
  const userName = user?.email?.split("@")[0] ?? "User";

  const BUYER_NAV: SidebarItem[] = [
    { to: "/buyer", label: t("shell.nav.home"), icon: HomeIcon, end: true },
    { to: "/buyer/customers", label: t("shell.nav.customers"), icon: UsersIcon },
    { to: "/buyer/requests", label: t("shell.nav.requests"), icon: ClipboardIcon },
    { to: "/buyer/requests/new", label: t("shell.nav.createRequest"), icon: PlusIcon, accent: true },
    { to: "/buyer/offers", label: t("shell.nav.offers"), icon: TagIcon },
    { to: "/buyer/orders", label: t("shell.nav.orders"), icon: FileTextIcon },
    { to: "/buyer/negotiations", label: t("shell.nav.negotiations"), icon: MessageIcon },
    { to: "/buyer/users", label: t("shell.nav.users"), icon: UsersIcon },
  ];

  return (
    <div className="app-shell">
      <Sidebar
        items={BUYER_NAV}
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