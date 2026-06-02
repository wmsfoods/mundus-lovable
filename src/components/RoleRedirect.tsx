import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import { getActiveRole } from "@/lib/activeRole";
import { isNativeApp } from "@/lib/isNativeApp";

export function RoleRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCurrentCompany();
  const { isAdmin, loading: adminLoading } = useIsMundusAdmin();

  if (authLoading || (user && (companyLoading || adminLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#B64769] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to={isNativeApp() ? "/login" : "/home"} replace />;

  if (isAdmin) return <Navigate to="/admin" replace />;

  const available: string[] = [
    ...(company?.is_supplier ? ["supplier"] : []),
    ...(company?.is_buyer ? ["buyer"] : []),
  ];
  if (available.length > 0) {
    const saved = getActiveRole();
    const target = saved && available.includes(saved) ? saved : available[0];
    return <Navigate to={`/${target}`} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}