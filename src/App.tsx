import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
// build: 2026-05-27 republish revenue/team/audit routes
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WeightUnitProvider } from "@/contexts/WeightUnitContext";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import { PreLoginOnboardingRedirect } from "@/components/PreLoginOnboardingRedirect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PushNavigationHandler } from "@/components/PushNavigationHandler";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/auth/ForgotPassword.tsx";
import ResetPassword from "./pages/auth/ResetPassword.tsx";
import Signup from "./pages/signup/Signup.tsx";
import SignupSuccess from "./pages/signup/SignupSuccess.tsx";
import PartnerSignup from "./pages/signup/PartnerSignup.tsx";
import ShareOfferRedirect from "./pages/ShareOfferRedirect.tsx";
import InviteAccept from "./pages/InviteAccept.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import NotFound from "./pages/NotFound.tsx";
import BuyerShell from "./layouts/BuyerShell.tsx";
import SupplierShell from "./layouts/SupplierShell.tsx";
import BuyerHome from "./pages/buyer/Home.tsx";
import BuyerOffers from "./pages/buyer/Offers.tsx";
import BuyerOfferDetail from "./pages/buyer/OfferDetail.tsx";
import BuyerOrders from "./pages/buyer/Orders.tsx";
import BuyerOrderDetail from "./pages/buyer/OrderDetail.tsx";
import BuyerUsers from "./pages/buyer/BuyerUsers.tsx";
import BuyerCompany from "./pages/buyer/BuyerCompany.tsx";
import BuyerNegotiations from "./pages/buyer/BuyerNegotiations.tsx";
import BuyerNegotiationDetail from "./pages/buyer/BuyerNegotiationDetail.tsx";
import BuyerRequests from "./pages/buyer/BuyerRequests.tsx";
import BuyerRequestDetail from "./pages/buyer/BuyerRequestDetail.tsx";
import BuyerCreateRequest from "./pages/buyer/BuyerCreateRequest.tsx";
import BuyerChat from "./pages/buyer/BuyerChat.tsx";
import ProcurementIntelligence from "./pages/buyer/ProcurementIntelligence.tsx";
import BuyerConnectedSuppliers from "./pages/buyer/ConnectedSuppliers.tsx";
import SubscriptionSuccess from "./pages/SubscriptionSuccess.tsx";
import { RequirePro } from "./components/billing/RequirePro.tsx";
import AdminShell from "./pages/admin/AdminShell.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminComingSoon from "./pages/admin/AdminComingSoon.tsx";
import AdminFeatureFlags from "./pages/admin/AdminFeatureFlags.tsx";
import AdminUserRequests from "./pages/admin/AdminUserRequests.tsx";
import AdminBuyerRequests from "./pages/admin/AdminBuyerRequests.tsx";
import AdminProspects from "./pages/admin/AdminProspects.tsx";
import AdminCompanies from "./pages/admin/AdminCompanies.tsx";
import AdminCompanyDetail from "./pages/admin/AdminCompanyDetail.tsx";
import AdminNegotiations from "./pages/admin/AdminNegotiations.tsx";
import AdminOffers from "./pages/admin/AdminOffers.tsx";
// (admin route reuses SupplierOfferDetail imported below)
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail.tsx";
import AdminRevenue from "./pages/admin/AdminRevenue.tsx";
import AdminAuditLog from "./pages/admin/AdminAuditLog.tsx";
import AdminTeam from "./pages/admin/AdminTeam.tsx";
import AdminDocs from "./pages/admin/AdminDocs.tsx";
import AdminDataManagement from "./pages/admin/AdminDataManagement.tsx";
import AdminImport from "./pages/admin/AdminImport.tsx";
import EmailPreview from "./pages/admin/EmailPreview.tsx";
import EmailQueue from "./pages/admin/EmailQueue.tsx";
import EmailActivity from "./pages/admin/EmailActivity.tsx";
import WhatsLayout from "./pages/admin/whats/WhatsLayout.tsx";
import WhatsConversas from "./pages/admin/whats/WhatsConversas.tsx";
import WhatsContatos from "./pages/admin/whats/WhatsContatos.tsx";
import WhatsTarefas from "./pages/admin/whats/WhatsTarefas.tsx";
import WhatsMacros from "./pages/admin/whats/WhatsMacros.tsx";
import WhatsAnalises from "./pages/admin/whats/WhatsAnalises.tsx";
import WhatsConfiguracoes from "./pages/admin/whats/WhatsConfiguracoes.tsx";
import AdminProspectsPipeline from "./pages/admin/AdminProspectsPipeline.tsx";
import CRMPipeline from "./pages/admin/CRMPipeline.tsx";
import MeetingPrep from "./pages/admin/MeetingPrep.tsx";
import AdminProspectDetail from "./pages/admin/AdminProspectDetail.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminBIMarket from "./pages/admin/AdminBIMarket.tsx";
import AdminBINegotiations from "./pages/admin/AdminBINegotiations.tsx";
import AdminBIDemand from "./pages/admin/AdminBIDemand.tsx";
import AdminBIOverview from "./pages/admin/AdminBIOverview.tsx";
import AdminMarkets from "./pages/admin/AdminMarkets.tsx";
import AdminPorts from "./pages/admin/AdminPorts.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import OutreachCenter from "./pages/admin/OutreachCenter.tsx";
import OutreachCampaigns from "./pages/admin/OutreachCampaigns.tsx";
import OutreachTemplates from "./pages/admin/OutreachTemplates.tsx";
import EmailSettings from "./pages/admin/EmailSettings.tsx";
import FindCompanies from "./pages/admin/prospect/FindCompanies.tsx";
import FindPeople from "./pages/admin/prospect/FindPeople.tsx";
import ProspectLists from "./pages/admin/prospect/Lists.tsx";
import ProspectListDetail from "./pages/admin/prospect/ListDetail.tsx";

import SupplierHome from "./pages/supplier/Home.tsx";
import SupplierOffers from "./pages/supplier/Offers.tsx";
import SupplierAuctions from "./pages/supplier/SupplierAuctions.tsx";
import SupplierCreateOfferV2 from "./pages/supplier/SupplierCreateOfferV2.tsx";
import SupplierCreateAuction from "./pages/supplier/SupplierCreateAuction.tsx";
import SupplierAuctionDetail from "./pages/supplier/SupplierAuctionDetail.tsx";
import SupplierOfferDetail from "./pages/supplier/OfferDetail.tsx";
import SupplierRequests from "./pages/supplier/Requests.tsx";
import SupplierRequestDetail from "./pages/supplier/RequestDetail.tsx";
import SupplierSales from "./pages/supplier/Sales.tsx";
import SupplierSaleDetail from "./pages/supplier/SaleDetail.tsx";
import SupplierUsers from "./pages/supplier/SupplierUsers.tsx";
import SupplierMyCustomers from "./pages/supplier/MyCustomers.tsx";
import SupplierNegotiations from "./pages/supplier/SupplierNegotiations.tsx";
import SupplierNegotiationDetail from "./pages/supplier/SupplierNegotiationDetail.tsx";
import SupplierCompany from "./pages/supplier/SupplierCompany.tsx";
import SupplierOffices from "./pages/supplier/SupplierOffices.tsx";
import PriceBenchmark from "./pages/supplier/PriceBenchmark.tsx";
import SupplierAnalytics from "./pages/supplier/SupplierAnalytics.tsx";
import CutComparison from "./pages/supplier/CutComparison.tsx";
import DevIndex from "./pages/DevIndex.tsx";
import Profile from "./pages/Profile.tsx";
import Notifications from "./pages/Notifications.tsx";
import NotificationPreferences from "./pages/settings/NotificationPreferences.tsx";
import { getActiveRole } from "@/lib/activeRole";

function NotificationPreferencesRedirect() {
  const role = getActiveRole();
  return (
    <Navigate
      to={role === "supplier" ? "/supplier/settings/notifications" : "/buyer/settings/notifications"}
      replace
    />
  );
}
import SupplierRespond from "./pages/public/SupplierRespond.tsx";
import ShippingInstructionsForm from "./pages/public/ShippingInstructionsForm.tsx";
import ShippingInstructionsPrint from "./pages/public/ShippingInstructionsPrint.tsx";
import PublicHome from "./pages/public/PublicHome.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evita o "flash" de re-render quando a janela/iframe ganha foco
      // (clicar no preview disparava refetch global e parecia que a página recarregava).
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    },
  },
});

function RedirectPreservingQuery({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PushNavigationHandler />
          <AuthProvider>
            <WeightUnitProvider>
            <Routes>
            <Route path="/" element={<PreLoginOnboardingRedirect />} />
            <Route path="/welcome" element={<Navigate to="/onboarding" replace />} />
            <Route path="/dev" element={<DevIndex />} />
            <Route path="/dev/ai-quickfill-samples" element={<Navigate to="/admin/docs?tab=admin&doc=ai-quickfill-samples" replace />} />
            <Route path="/admin/docs/ai-quickfill-samples" element={<Navigate to="/admin/docs?tab=admin&doc=ai-quickfill-samples" replace />} />
            <Route path="/home" element={<PublicHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/success" element={<SignupSuccess />} />
            <Route path="/signup/partner" element={<PartnerSignup />} />
            <Route path="/respond/:token" element={<SupplierRespond />} />
           <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/shipping-instructions/:token" element={<ShippingInstructionsForm />} />
            <Route path="/shipping-instructions/print/:requestId" element={<ShippingInstructionsPrint />} />
            <Route path="/s/offer/:id" element={<ShareOfferRedirect />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <Notifications />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/notifications"
              element={
                <RequireAuth>
                  <NotificationPreferencesRedirect />
                </RequireAuth>
              }
            />
            <Route
              path="/buyer"
              element={
                <RequireAuth>
                  <ErrorBoundary>
                    <BuyerShell />
                  </ErrorBoundary>
                </RequireAuth>
              }
            >
              <Route index element={<BuyerHome />} />
              <Route path="connected-suppliers" element={<BuyerConnectedSuppliers />} />
              <Route path="offers" element={<BuyerOffers />} />
              <Route path="offers/:id" element={<BuyerOfferDetail />} />
              <Route path="marketplace" element={<BuyerOffers />} />
              <Route path="marketplace/:id" element={<BuyerOfferDetail />} />
              <Route path="orders" element={<BuyerOrders />} />
              <Route path="orders/:id" element={<BuyerOrderDetail />} />
              <Route path="users" element={<BuyerUsers />} />
              <Route path="company" element={<BuyerCompany />} />
              <Route path="offices" element={<SupplierOffices />} />
              <Route path="negotiations" element={<BuyerNegotiations />} />
              <Route path="negotiations/:id" element={<BuyerNegotiationDetail />} />
              <Route path="requests" element={<BuyerRequests />} />
              <Route path="requests/new" element={<BuyerCreateRequest />} />
             <Route path="requests/:editId/edit" element={<BuyerCreateRequest />} />
              <Route path="requests/:id" element={<BuyerRequestDetail />} />
              <Route path="chat" element={<BuyerChat />} />
              <Route path="chat/:conversationId" element={<BuyerChat />} />
              <Route
                path="procurement-intelligence"
                element={
                  <RequirePro feature="procurement" side="buyer">
                    <ProcurementIntelligence />
                  </RequirePro>
                }
              />
              <Route path="subscription-success" element={<SubscriptionSuccess side="buyer" />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings/notifications" element={<NotificationPreferences />} />
            </Route>
            <Route
              path="/supplier"
              element={
                <RequireAuth>
                  <ErrorBoundary>
                    <SupplierShell />
                  </ErrorBoundary>
                </RequireAuth>
              }
            >
              <Route index element={<SupplierHome />} />
              <Route path="offers" element={<SupplierOffers />} />
              <Route path="auctions" element={<SupplierAuctions />} />
              <Route path="auctions/create" element={<SupplierCreateAuction />} />
              <Route path="auctions/:id" element={<SupplierAuctionDetail />} />
              <Route path="offers/new" element={<SupplierCreateOfferV2 />} />
              <Route path="offers/new-v2" element={<RedirectPreservingQuery to="/supplier/offers/new" />} />
              <Route path="offers/:id" element={<SupplierOfferDetail />} />
              <Route path="requests" element={<SupplierRequests />} />
              <Route path="requests/:id" element={<SupplierRequestDetail />} />
              <Route path="sales" element={<SupplierSales />} />
              <Route path="sales/:id" element={<SupplierSaleDetail />} />
              <Route path="users" element={<SupplierUsers />} />
              <Route path="my-customers" element={<SupplierMyCustomers />} />
              <Route path="company" element={<SupplierCompany />} />
              <Route path="offices" element={<SupplierOffices />} />
              <Route path="negotiations" element={<SupplierNegotiations />} />
              <Route path="negotiations/:id" element={<SupplierNegotiationDetail />} />
              <Route
                path="insights/price-benchmark"
                element={
                  <RequirePro feature="price-benchmark" side="supplier">
                    <PriceBenchmark />
                  </RequirePro>
                }
              />
              <Route
                path="insights/analytics"
                element={
                  <RequirePro feature="analytics" side="supplier">
                    <SupplierAnalytics />
                  </RequirePro>
                }
              />
              <Route
                path="insights/cut-comparison"
                element={
                  <RequirePro feature="cut-comparison" side="supplier">
                    <CutComparison />
                  </RequirePro>
                }
              />
              <Route path="subscription-success" element={<SubscriptionSuccess side="supplier" />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings/notifications" element={<NotificationPreferences />} />
            </Route>
            <Route path="/admin" element={
              <RequireAuth>
                <RequireAdmin>
                  <ErrorBoundary>
                    <AdminShell />
                  </ErrorBoundary>
                </RequireAdmin>
              </RequireAuth>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="bi" element={<AdminBIOverview />} />
              <Route path="bi/market" element={<AdminBIMarket />} />
              <Route path="bi/negotiations" element={<AdminBINegotiations />} />
              <Route path="bi/demand" element={<AdminBIDemand />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="companies/new" element={<AdminCompanyDetail mode="new" />} />
              <Route path="companies/:id" element={<AdminCompanyDetail />} />
              <Route path="offers" element={<AdminOffers />} />
              <Route path="offers/:id" element={<SupplierOfferDetail adminMode />} />
              <Route path="deals" element={<AdminOrders />} />
              <Route path="deals/:id" element={<AdminOrderDetail />} />
              <Route path="negotiations" element={<AdminNegotiations />} />
              <Route path="negotiations/:id" element={<SupplierNegotiationDetail />} />
              <Route path="crm/prospects" element={<AdminProspects />} />
              <Route path="crm/prospects/:id" element={<AdminProspectDetail />} />
              <Route path="crm/pipeline" element={<CRMPipeline />} />
              <Route path="crm/meeting-prep/:companyId" element={<MeetingPrep />} />
              <Route path="crm/funnel" element={<AdminProspectsPipeline />} />
              <Route path="prospect/companies" element={<FindCompanies />} />
              <Route path="prospect/people" element={<FindPeople />} />
              <Route path="prospect/lists" element={<ProspectLists />} />
              <Route path="prospect/lists/:id" element={<ProspectListDetail />} />
              <Route path="marketplace/products" element={<AdminProducts />} />
              <Route path="marketplace/markets" element={<AdminMarkets />} />
              <Route path="marketplace/ports" element={<AdminPorts />} />
              <Route path="finance/revenue" element={<AdminRevenue />} />
              <Route path="finance/commissions" element={<AdminComingSoon section="finance/commissions" />} />
              <Route path="settings/team" element={<AdminTeam />} />
              <Route path="settings/audit" element={<AdminAuditLog />} />
              <Route path="settings/flags" element={<AdminFeatureFlags />} />
              <Route path="docs" element={<AdminDocs />} />
              <Route path="data-management" element={<AdminDataManagement />} />
              <Route path="import" element={<AdminImport />} />
              <Route path="migration" element={<AdminImport />} />
              <Route path="user-requests" element={<AdminUserRequests />} />
              <Route path="offer-requests" element={<AdminBuyerRequests />} />
              <Route path="outreach" element={<OutreachCenter />} />
              <Route path="outreach/campaigns" element={<OutreachCampaigns />} />
              <Route path="outreach/templates" element={<OutreachTemplates />} />
              <Route path="settings/email" element={<EmailSettings />} />
              <Route path="email-preview" element={<EmailPreview />} />
              <Route path="create-offer" element={<SupplierCreateOfferV2 />} />
              <Route path="create-request" element={<BuyerCreateRequest />} />
              <Route path="email-queue" element={<EmailQueue />} />
              <Route path="email-activity" element={<EmailActivity />} />
              <Route path="whats" element={<WhatsLayout />}>
                <Route index element={<WhatsConversas />} />
                <Route path="conversas" element={<WhatsConversas />} />
                <Route path="contatos" element={<WhatsContatos />} />
                <Route path="tarefas" element={<WhatsTarefas />} />
                <Route path="macros" element={<WhatsMacros />} />
                <Route path="analises" element={<WhatsAnalises />} />
                <Route path="configuracoes" element={<WhatsConfiguracoes />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
            </Routes>
            </WeightUnitProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
