import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useIsMundusAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#B64769] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}