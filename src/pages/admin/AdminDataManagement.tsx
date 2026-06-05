import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import NotFound from "@/pages/NotFound";
import OffersAdminTab from "@/components/admin/DataManagement/tabs/OffersAdminTab";
import NegotiationsAdminTab from "@/components/admin/DataManagement/tabs/NegotiationsAdminTab";
import OrdersAdminTab from "@/components/admin/DataManagement/tabs/OrdersAdminTab";
import BuyerRequestsAdminTab from "@/components/admin/DataManagement/tabs/BuyerRequestsAdminTab";
import CompaniesAdminTab from "@/components/admin/DataManagement/tabs/CompaniesAdminTab";
import UsersAdminTab from "@/components/admin/DataManagement/tabs/UsersAdminTab";
import CutsAdminTab from "@/components/admin/DataManagement/tabs/CutsAdminTab";

export default function AdminDataManagement() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useIsMundusAdmin();
  const [tab, setTab] = useState("offers");

  if (loading) {
    return <div style={{ padding: 20, fontSize: 12, color: "#908d85" }}>{t("admin.dataManagement.loading", "Loading…")}</div>;
  }
  if (!isAdmin) return <NotFound />;

  const TABS: Array<{ key: string; label: string; el: JSX.Element }> = [
    { key: "offers",       label: t("admin.dataManagement.tabs.offers",       "Offers"),         el: <OffersAdminTab /> },
    { key: "negotiations", label: t("admin.dataManagement.tabs.negotiations", "Negotiations"),   el: <NegotiationsAdminTab /> },
    { key: "orders",       label: t("admin.dataManagement.tabs.orders",       "Sales / Orders"), el: <OrdersAdminTab /> },
    { key: "requests",     label: t("admin.dataManagement.tabs.requests",     "Buyer Requests"), el: <BuyerRequestsAdminTab /> },
    { key: "companies",    label: t("admin.dataManagement.tabs.companies",    "Companies"),      el: <CompaniesAdminTab /> },
    { key: "users",        label: t("admin.dataManagement.tabs.users",        "Users"),          el: <UsersAdminTab /> },
    { key: "cuts",         label: t("admin.dataManagement.tabs.cuts",         "Cuts"),           el: <CutsAdminTab /> },
  ];

  return (
    <div className="adm-page" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Database size={16} />
        <h1 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a18", margin: 0 }}>
          {t("admin.dataManagement.title", "Data Management")}
        </h1>
        <span style={{ fontSize: 11, color: "#908d85" }}>
          {t("admin.dataManagement.subtitle", "Read-only inventory of platform data (delete actions arrive in A2)")}
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ flexWrap: "wrap", height: "auto" }}>
          {TABS.map((tb) => (
            <TabsTrigger key={tb.key} value={tb.key}>{tb.label}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tb) => (
          <TabsContent key={tb.key} value={tb.key} style={{ marginTop: 8 }}>
            {tb.el}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}