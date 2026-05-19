import { useState } from "react";
import { Outlet } from "react-router-dom";
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

const SUPPLIER_NAV: SidebarItem[] = [
  { to: "/supplier", label: "Home", icon: HomeIcon, end: true },
  { to: "/supplier/offers", label: "My Offers", icon: TagIcon },
  { to: "/supplier/offers/new", label: "Create Offer", icon: PlusIcon, accent: true },
  { to: "/supplier/sales", label: "Sales", icon: FileTextIcon },
  { to: "/supplier/negotiations", label: "Negotiations", icon: MessageIcon },
  { to: "/supplier/requests", label: "Offer Requests", icon: ClipboardIcon },
  { to: "/supplier/users", label: "Users", icon: UsersIcon },
];

export default function SupplierShell() {
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userName = user?.email?.split("@")[0] ?? "User";

  return (
    <div className="app-shell">
      <Sidebar
        items={SUPPLIER_NAV}
        rolePill="Supplier"
        userName={userName}
        userSubtitle={company?.name}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Topbar onMenuClick={() => setMobileOpen(true)} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
