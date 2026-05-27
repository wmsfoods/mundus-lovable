import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Loose types — Supabase types regenerate, but new tables may not be in types.ts yet.
const sb = supabase as unknown as {
  from: (table: string) => any;
  storage: typeof supabase.storage;
};

export type CompanyAbout = {
  id?: string;
  company_id: string;
  description: string | null;
  trade_name: string | null;
  logo_text: string | null;
  trade_markets: string[];
  main_species: string[];
  years_exporting: number | null;
  fcls_delivered: number | null;
  countries_served: number | null;
  member_since: number | null;
};

export type CompanyPlant = {
  id: string;
  company_id: string;
  name: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  capacity: string | null;
  certifications: string[];
  vet_registrations: string | null;
  sort_order: number;
};

export type CompanyCertification = {
  id: string;
  company_id: string;
  name: string;
  issuer: string | null;
  valid_until: string | null;
  certificate_url: string | null;
  sort_order: number;
};

export type CompanyDocument = {
  id: string;
  company_id: string;
  doc_type: string;
  name: string;
  file_url: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyTeamMember = {
  id: string;
  company_id: string;
  name: string;
  title: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type CompanyPreferences = {
  id?: string;
  company_id: string;
  default_incoterm: string | null;
  default_payment_terms: string | null;
  currencies: string[];
  lead_time: string | null;
  fcl_size: string | null;
  origin_ports: string[];
};

export type CompanyProfileData = {
  about: CompanyAbout | null;
  plants: CompanyPlant[];
  certifications: CompanyCertification[];
  documents: CompanyDocument[];
  team: CompanyTeamMember[];
  preferences: CompanyPreferences | null;
};

export function useCompanyProfile(companyId: string | undefined) {
  const [data, setData] = useState<CompanyProfileData>({
    about: null, plants: [], certifications: [], documents: [], team: [], preferences: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [aboutR, plantsR, certsR, docsR, teamR, prefsR] = await Promise.all([
        sb.from("company_about").select("*").eq("company_id", companyId).maybeSingle(),
        sb.from("company_plants").select("*").eq("company_id", companyId).order("sort_order").order("created_at"),
        sb.from("company_certifications").select("*").eq("company_id", companyId).order("sort_order").order("created_at"),
        sb.from("company_documents").select("*").eq("company_id", companyId).order("updated_at", { ascending: false }),
        sb.from("company_team_members").select("*").eq("company_id", companyId).order("sort_order").order("created_at"),
        sb.from("company_preferences").select("*").eq("company_id", companyId).maybeSingle(),
      ]);
      setData({
        about: aboutR.data ?? null,
        plants: plantsR.data ?? [],
        certifications: certsR.data ?? [],
        documents: docsR.data ?? [],
        team: teamR.data ?? [],
        preferences: prefsR.data ?? null,
      });
    } catch (e: any) {
      setError(e?.message ?? "load failed");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  // ------------- About (upsert)
  const saveAbout = useCallback(async (patch: Partial<CompanyAbout>) => {
    if (!companyId) return { ok: false, error: "no company" };
    const payload = { company_id: companyId, ...data.about, ...patch };
    const { error: err } = await sb.from("company_about").upsert(payload, { onConflict: "company_id" });
    if (err) return { ok: false, error: err.message };
    await load();
    return { ok: true };
  }, [companyId, data.about, load]);

  // ------------- Generic row CRUD helpers
  const insertRow = useCallback(async (table: string, row: any) => {
    if (!companyId) return { ok: false, error: "no company" };
    const { error: err } = await sb.from(table).insert({ ...row, company_id: companyId });
    if (err) return { ok: false, error: err.message };
    await load();
    return { ok: true };
  }, [companyId, load]);

  const updateRow = useCallback(async (table: string, id: string, patch: any) => {
    const { error: err } = await sb.from(table).update(patch).eq("id", id);
    if (err) return { ok: false, error: err.message };
    await load();
    return { ok: true };
  }, [load]);

  const deleteRow = useCallback(async (table: string, id: string) => {
    const { error: err } = await sb.from(table).delete().eq("id", id);
    if (err) return { ok: false, error: err.message };
    await load();
    return { ok: true };
  }, [load]);

  const savePreferences = useCallback(async (patch: Partial<CompanyPreferences>) => {
    if (!companyId) return { ok: false, error: "no company" };
    const payload = { company_id: companyId, ...data.preferences, ...patch };
    const { error: err } = await sb.from("company_preferences").upsert(payload, { onConflict: "company_id" });
    if (err) return { ok: false, error: err.message };
    await load();
    return { ok: true };
  }, [companyId, data.preferences, load]);

  // ------------- Document upload
  const uploadDocument = useCallback(async (file: File, docType: string, displayName?: string) => {
    if (!companyId) return { ok: false, error: "no company" };
    if (file.size > 20 * 1024 * 1024) return { ok: false, error: "File exceeds 20MB" };
    const ext = file.name.split(".").pop() || "bin";
    const path = `${companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await sb.storage.from("company-files").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) return { ok: false, error: up.error.message };
    const { error: dbErr } = await sb.from("company_documents").insert({
      company_id: companyId,
      doc_type: docType,
      name: displayName || file.name,
      file_url: path,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
    });
    if (dbErr) return { ok: false, error: dbErr.message };
    await load();
    return { ok: true };
  }, [companyId, load]);

  const deleteDocument = useCallback(async (doc: CompanyDocument) => {
    if (doc.file_path) {
      await sb.storage.from("company-files").remove([doc.file_path]);
    }
    return deleteRow("company_documents", doc.id);
  }, [deleteRow]);

  return {
    data, loading, error, refresh: load,
    saveAbout, savePreferences,
    insertRow, updateRow, deleteRow,
    uploadDocument, deleteDocument,
  };
}