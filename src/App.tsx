import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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
import SupplierHome from "./pages/supplier/Home.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
