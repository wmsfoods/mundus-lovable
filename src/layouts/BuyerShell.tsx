import { Outlet } from "react-router-dom";
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

const BUYER_NAV: SidebarItem[] = [
  { to: "/buyer", label: "Home", icon: HomeIcon, end: true },
  { to: "/buyer/customers", label: "My Customers", icon: UsersIcon },
  { to: "/buyer/requests", label: "My offer requests", icon: ClipboardIcon },
  { to: "/buyer/requests/new", label: "Create Request", icon: PlusIcon, accent: true },
  { to: "/buyer/offers", label: "Offers", icon: TagIcon },
  { to: "/buyer/orders", label: "Orders", icon: FileTextIcon },
  { to: "/buyer/negotiations", label: "Negotiations", icon: MessageIcon },
  { to: "/buyer/users", label: "Users", icon: UsersIcon },
];

export default function BuyerShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const userName = user?.email?.split("@")[0] ?? "User";

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