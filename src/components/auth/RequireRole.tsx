import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

export function useCompanyRole(): { role: string | null; isMundusAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading } = useCurrentCompany();
  const [state, setState] = useState<{ role: string | null; isMundusAdmin: boolean; loading: boolean }>({
    role: null,
    isMundusAdmin: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading || companyLoading) return;
    if (!user?.id) {
      setState({ role: null, isMundusAdmin: false, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: cu }, { data: adminFlag }] = await Promise.all([
        company?.id
          ? supabase
              .from("company_users")
              .select("role")
              .eq("user_id", user.id)
              .eq("company_id", company.id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
        supabase.rpc("is_mundus_admin"),
      ]);
      if (cancelled) return;
      setState({
        role: (cu as any)?.role ?? null,
        isMundusAdmin: adminFlag === true,
        loading: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, company?.id, authLoading, companyLoading]);

  return state;
}

export function RequireRole({
  roles,
  allowMundusAdmin = true,
  fallback = null,
  children,
}: {
  roles: string[];
  allowMundusAdmin?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { role, isMundusAdmin, loading } = useCompanyRole();
  if (loading) return null;
  if (allowMundusAdmin && isMundusAdmin) return <>{children}</>;
  if (role && roles.includes(role)) return <>{children}</>;
  return <>{fallback}</>;
}