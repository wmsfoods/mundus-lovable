import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

export function RoleRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCurrentCompany();

  if (authLoading || (user && companyLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#B64769] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (company?.is_buyer) return <Navigate to="/buyer" replace />;
  if (company?.is_supplier) return <Navigate to="/supplier" replace />;

  return <Navigate to="/dashboard" replace />;
}