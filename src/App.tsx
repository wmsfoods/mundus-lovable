import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RequireAuth } from "@/components/RequireAuth";
import { RoleRedirect } from "@/components/RoleRedirect";
import Login from "./pages/Login.tsx";
import Signup from "./pages/signup/Signup.tsx";
import SignupSuccess from "./pages/signup/SignupSuccess.tsx";
import PartnerSignup from "./pages/signup/PartnerSignup.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import BuyerShell from "./layouts/BuyerShell.tsx";
import SupplierShell from "./layouts/SupplierShell.tsx";
import BuyerHome from "./pages/buyer/Home.tsx";
import BuyerOffers from "./pages/buyer/Offers.tsx";
import BuyerOfferDetail from "./pages/buyer/OfferDetail.tsx";
import BuyerOrders from "./pages/buyer/Orders.tsx";
import BuyerOrderDetail from "./pages/buyer/OrderDetail.tsx";
import BuyerUsers from "./pages/buyer/BuyerUsers.tsx";
import BuyerNegotiations from "./pages/buyer/BuyerNegotiations.tsx";
import BuyerNegotiationDetail from "./pages/buyer/BuyerNegotiationDetail.tsx";
import BuyerRequests from "./pages/buyer/BuyerRequests.tsx";
import BuyerRequestDetail from "./pages/buyer/BuyerRequestDetail.tsx";
import BuyerChat from "./pages/buyer/BuyerChat.tsx";
import AdminShell from "./pages/admin/AdminShell.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminComingSoon from "./pages/admin/AdminComingSoon.tsx";
import AdminProspects from "./pages/admin/AdminProspects.tsx";
import AdminCompanies from "./pages/admin/AdminCompanies.tsx";
import AdminCompanyDetail from "./pages/admin/AdminCompanyDetail.tsx";
import AdminNegotiations from "./pages/admin/AdminNegotiations.tsx";
import AdminProspectsPipeline from "./pages/admin/AdminProspectsPipeline.tsx";
import AdminProspectDetail from "./pages/admin/AdminProspectDetail.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminMarkets from "./pages/admin/AdminMarkets.tsx";
import AdminPorts from "./pages/admin/AdminPorts.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import FindCompanies from "./pages/admin/prospect/FindCompanies.tsx";
import FindPeople from "./pages/admin/prospect/FindPeople.tsx";
import ProspectLists from "./pages/admin/prospect/Lists.tsx";
import ProspectListDetail from "./pages/admin/prospect/ListDetail.tsx";

import SupplierHome from "./pages/supplier/Home.tsx";
import SupplierOffers from "./pages/supplier/Offers.tsx";
import SupplierCreateOffer from "./pages/supplier/SupplierCreateOffer.tsx";
import SupplierOfferDetail from "./pages/supplier/OfferDetail.tsx";
import SupplierRequests from "./pages/supplier/Requests.tsx";
import SupplierRequestDetail from "./pages/supplier/RequestDetail.tsx";
import SupplierSales from "./pages/supplier/Sales.tsx";
import SupplierSaleDetail from "./pages/supplier/SaleDetail.tsx";
import SupplierUsers from "./pages/supplier/SupplierUsers.tsx";
import SupplierNegotiations from "./pages/supplier/SupplierNegotiations.tsx";
import SupplierNegotiationDetail from "./pages/supplier/SupplierNegotiationDetail.tsx";
import SupplierCompany from "./pages/supplier/SupplierCompany.tsx";
import PriceBenchmark from "./pages/supplier/PriceBenchmark.tsx";
import SupplierAnalytics from "./pages/supplier/SupplierAnalytics.tsx";
import DevIndex from "./pages/DevIndex.tsx";
import Profile from "./pages/Profile.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/dev" element={<DevIndex />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/success" element={<SignupSuccess />} />
            <Route path="/signup/partner" element={<PartnerSignup />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/buyer"
              element={
                <RequireAuth>
                  <BuyerShell />
                </RequireAuth>
              }
            >
              <Route index element={<BuyerHome />} />
              <Route path="offers" element={<BuyerOffers />} />
              <Route path="offers/:id" element={<BuyerOfferDetail />} />
              <Route path="orders" element={<BuyerOrders />} />
              <Route path="orders/:id" element={<BuyerOrderDetail />} />
              <Route path="users" element={<BuyerUsers />} />
              <Route path="negotiations" element={<BuyerNegotiations />} />
              <Route path="negotiations/:id" element={<BuyerNegotiationDetail />} />
              <Route path="requests" element={<BuyerRequests />} />
              <Route path="requests/:id" element={<BuyerRequestDetail />} />
              <Route path="chat" element={<BuyerChat />} />
              <Route path="chat/:conversationId" element={<BuyerChat />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route
              path="/supplier"
              element={
                <RequireAuth>
                  <SupplierShell />
                </RequireAuth>
              }
            >
              <Route index element={<SupplierHome />} />
              <Route path="offers" element={<SupplierOffers />} />
              <Route path="offers/new" element={<SupplierCreateOffer />} />
              <Route path="offers/:id" element={<SupplierOfferDetail />} />
              <Route path="requests" element={<SupplierRequests />} />
              <Route path="requests/:id" element={<SupplierRequestDetail />} />
              <Route path="sales" element={<SupplierSales />} />
              <Route path="sales/:id" element={<SupplierSaleDetail />} />
              <Route path="users" element={<SupplierUsers />} />
              <Route path="company" element={<SupplierCompany />} />
              <Route path="negotiations" element={<SupplierNegotiations />} />
              <Route path="negotiations/:id" element={<SupplierNegotiationDetail />} />
              <Route path="insights/price-benchmark" element={<PriceBenchmark />} />
              <Route path="insights/analytics" element={<SupplierAnalytics />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="companies/new" element={<AdminCompanyDetail mode="new" />} />
              <Route path="companies/:id" element={<AdminCompanyDetail />} />
              <Route path="deals" element={<AdminComingSoon section="deals" />} />
              <Route path="negotiations" element={<AdminNegotiations />} />
              <Route path="verifications" element={<AdminComingSoon section="verifications" />} />
              <Route path="disputes" element={<AdminComingSoon section="disputes" />} />
              <Route path="crm/prospects" element={<AdminProspects />} />
              <Route path="crm/prospects/:id" element={<AdminProspectDetail />} />
              <Route path="crm/pipeline" element={<AdminProspectsPipeline />} />
              <Route path="prospect/companies" element={<FindCompanies />} />
              <Route path="prospect/people" element={<FindPeople />} />
              <Route path="prospect/lists" element={<ProspectLists />} />
              <Route path="prospect/lists/:id" element={<ProspectListDetail />} />
              <Route path="marketplace/products" element={<AdminProducts />} />
              <Route path="marketplace/markets" element={<AdminMarkets />} />
              <Route path="marketplace/ports" element={<AdminPorts />} />
              <Route path="finance/revenue" element={<AdminComingSoon section="finance/revenue" />} />
              <Route path="finance/commissions" element={<AdminComingSoon section="finance/commissions" />} />
              <Route path="settings/team" element={<AdminComingSoon section="settings/team" />} />
              <Route path="settings/audit" element={<AdminComingSoon section="settings/audit" />} />
              <Route path="settings/flags" element={<AdminComingSoon section="settings/flags" />} />
            </Route>
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
