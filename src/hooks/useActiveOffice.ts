import { useEffect, useState } from "react";
import { useCurrentCompany } from "./useCurrentCompany";
import { useCompanyOffices } from "./useCompanyOffices";

const STORAGE_KEY = "mundus_active_office";

export function useActiveOffice() {
  const { company } = useCurrentCompany();
  const { offices, loading } = useCompanyOffices(company?.id ?? null);
  const [activeOfficeId, setActiveOfficeId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setActiveOfficeId(saved);
  }, []);

  const setActiveOffice = (id: string | null) => {
    setActiveOfficeId(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const activeOffice = offices.find((o) => o.id === activeOfficeId) ?? null;
  const hasMultipleOffices = offices.length > 1;
  const isAllOffices = !activeOfficeId;

  return {
    activeOffice,
    activeOfficeId,
    setActiveOffice,
    offices,
    hasMultipleOffices,
    isAllOffices,
    loading,
  };
}