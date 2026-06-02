import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePreLoginOnboarding } from "@/hooks/usePreLoginOnboarding";
import { RoleRedirect } from "@/components/RoleRedirect";
import { isNativeApp } from "@/lib/isNativeApp";

/** Root route: native guests see onboarding once, then /home; logged-in users by role. */
export function PreLoginOnboardingRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { loading: obLoading, shouldShow } = usePreLoginOnboarding();
  const isNative = isNativeApp();

  if (authLoading || (isNative && !user && obLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 rounded-full border-2 border-[#B64769] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (isNative && shouldShow) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/home" replace />;
  }

  return <RoleRedirect />;
}
