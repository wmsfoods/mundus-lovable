import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "./useCurrentCompany";
import { useCompanyOffices } from "./useCompanyOffices";

const STORAGE_KEY = "mundus_active_office";

type UserOfficeAssignment = { company_id: string; role: string | null };

export function useActiveOffice() {
  const { company } = useCurrentCompany();
  const { offices: allOffices, loading } = useCompanyOffices(company?.id ?? null);
  const [activeOfficeId, setActiveOfficeId] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<UserOfficeAssignment[]>([]);
  const [userCtxLoaded, setUserCtxLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setActiveOfficeId(saved);
  }, []);

  // Fetch profile type + office assignments for the current user
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (!uid) {
          if (!cancelled) setUserCtxLoaded(true);
          return;
        }
        const [{ data: cu }, { data: uo }] = await Promise.all([
          (supabase as any)
            .from("company_users")
            .select("role")
            .eq("user_id", uid)
            .maybeSingle(),
          (supabase as any)
            .from("user_offices")
            .select("company_id, role")
            .eq("user_id", uid),
        ]);
        if (cancelled) return;
        setUserRole((cu as any)?.role ?? null);
        setAssignments(((uo as any[]) || []) as UserOfficeAssignment[]);
      } catch {
        /* fail open */
      } finally {
        if (!cancelled) setUserCtxLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveOffice = (id: string | null) => {
    setActiveOfficeId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const isMaster =
    userRole === "master_supplier" ||
    userRole === "master_buyer" ||
    userRole === "mundus_admin" ||
    userRole === "supplier_global_director";

  const isGlobalDirector = userRole === "supplier_global_director";

  // Fail open: if we couldn't resolve the user's context, show all offices
  // so we don't break existing behavior.
  const failOpen = userCtxLoaded && userRole === null && assignments.length === 0;

  const userOfficeIds = useMemo(
    () => assignments.map((a) => a.company_id),
    [assignments],
  );

  const visibleOffices = useMemo(() => {
    if (isMaster || failOpen) return allOffices;
    if (!userCtxLoaded) return allOffices; // while loading, don't flicker-hide
    return allOffices.filter((o) => userOfficeIds.includes(o.id));
  }, [isMaster, failOpen, userCtxLoaded, allOffices, userOfficeIds]);

  const showAllOfficesOption = isMaster || failOpen;
  const hasMultipleOffices = visibleOffices.length > 1;

  // Auto-lock single-office users to their only office
  useEffect(() => {
    if (!userCtxLoaded) return;
    if (isMaster || failOpen) return;
    if (visibleOffices.length === 1) {
      const onlyId = visibleOffices[0].id;
      if (activeOfficeId !== onlyId) {
        setActiveOfficeId(onlyId);
        localStorage.setItem(STORAGE_KEY, onlyId);
      }
    }
  }, [userCtxLoaded, isMaster, failOpen, visibleOffices, activeOfficeId]);

  // If the saved active office is no longer visible to this user, clear it
  useEffect(() => {
    if (!userCtxLoaded) return;
    if (isMaster || failOpen) return;
    if (activeOfficeId && !visibleOffices.some((o) => o.id === activeOfficeId)) {
      setActiveOfficeId(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [userCtxLoaded, isMaster, failOpen, visibleOffices, activeOfficeId]);

  const activeOffice = visibleOffices.find((o) => o.id === activeOfficeId) ?? null;
  // Non-masters never get the "All Offices" consolidated view
  const isAllOffices = showAllOfficesOption ? !activeOfficeId : false;

  return {
    activeOffice,
    activeOfficeId,
    setActiveOffice,
    offices: visibleOffices,
    hasMultipleOffices,
    isAllOffices,
    showAllOfficesOption,
    isMaster,
    isGlobalDirector,
    userRole,
    loading: loading || !userCtxLoaded,
  };
}