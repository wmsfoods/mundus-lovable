import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Office = {
  id: string;
  name: string;
  parent_company_id: string | null;
  office_type: "headquarters" | "regional_office" | "branch";
  office_name: string | null;
  office_country: string | null;
  office_region: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  address: string | null;
  phone: string | null;
  plant_numbers: string[] | null;
  is_buyer: boolean | null;
  is_supplier: boolean | null;
};

export type OfficeInput = Partial<Omit<Office, "id">>;

export function useCompanyOffices(currentCompanyId: string | null) {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffices = useCallback(async () => {
    if (!currentCompanyId) {
      setOffices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Headquarters = the company itself (assuming current company is HQ or its own parent ref)
    // Show: current company + all companies where parent_company_id = currentCompanyId
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, parent_company_id, office_type, office_name, office_country, office_region, country, city, state, zip_code, address, phone, plant_numbers, is_buyer, is_supplier"
      )
      .or(`id.eq.${currentCompanyId},parent_company_id.eq.${currentCompanyId}`);
    if (error) {
      setError(error.message);
      setOffices([]);
    } else {
      setOffices((data || []) as Office[]);
      setError(null);
    }
    setLoading(false);
  }, [currentCompanyId]);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  const createOffice = async (input: OfficeInput) => {
    const { error } = await supabase.from("companies").insert(input as never);
    if (error) throw error;
    await fetchOffices();
  };

  const updateOffice = async (id: string, input: OfficeInput) => {
    const { error } = await supabase.from("companies").update(input as never).eq("id", id);
    if (error) throw error;
    await fetchOffices();
  };

  const deleteOffice = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) throw error;
    await fetchOffices();
  };

  return { offices, loading, error, refetch: fetchOffices, createOffice, updateOffice, deleteOffice };
}