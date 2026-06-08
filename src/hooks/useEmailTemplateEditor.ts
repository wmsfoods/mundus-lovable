import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Locale = "pt" | "en";

export interface EditableField {
  key: string;
  label: string;
  type: "text" | "textarea" | "color" | "image" | "cta";
  maxLength?: number;
}
export interface TemplateVariable {
  key: string;
  label: string;
  sample: string;
}
export interface TemplateDefinition {
  template_key: string;
  name_pt: string;
  name_en: string;
  description_pt: string | null;
  description_en: string | null;
  category: string;
  hero_color: string;
  editable_fields: EditableField[];
  variables: TemplateVariable[];
  defaults_pt: Record<string, string>;
  defaults_en: Record<string, string>;
}
export interface TemplateVersion {
  id: string;
  template_key: string;
  locale: Locale;
  version_number: number;
  values: Record<string, string>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useTemplateDefinition(templateKey: string) {
  const [data, setData] = useState<TemplateDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (supabase as any)
      .from("email_template_definitions")
      .select("*")
      .eq("template_key", templateKey)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!alive) return;
        setData(data || null);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [templateKey]);
  return { definition: data, loading };
}

export function useTemplateVersions(templateKey: string, locale: Locale) {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: vs }, { data: a }] = await Promise.all([
      (supabase as any)
        .from("email_template_versions")
        .select("*")
        .eq("template_key", templateKey)
        .eq("locale", locale)
        .order("version_number", { ascending: false })
        .limit(50),
      (supabase as any)
        .from("email_template_active")
        .select("version_id")
        .eq("template_key", templateKey)
        .eq("locale", locale)
        .maybeSingle(),
    ]);
    setVersions(vs || []);
    setActiveId(a?.version_id || null);
    setLoading(false);
  }, [templateKey, locale]);

  useEffect(() => { refresh(); }, [refresh]);
  return { versions, activeId, loading, refresh };
}

export async function saveTemplateVersion(opts: {
  templateKey: string;
  locale: Locale;
  values: Record<string, string>;
  notes?: string;
}): Promise<{ id: string; version_number: number } | { error: string }> {
  const { templateKey, locale, values, notes } = opts;
  const { data: last } = await (supabase as any)
    .from("email_template_versions")
    .select("version_number")
    .eq("template_key", templateKey)
    .eq("locale", locale)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNumber = (last?.version_number || 0) + 1;
  const { data: user } = await supabase.auth.getUser();

  const { data: inserted, error } = await (supabase as any)
    .from("email_template_versions")
    .insert({
      template_key: templateKey,
      locale,
      version_number: nextNumber,
      values,
      notes: notes ?? null,
      created_by: user.user?.id ?? null,
    })
    .select("id, version_number")
    .single();
  if (error) return { error: error.message };

  await (supabase as any)
    .from("email_template_active")
    .upsert(
      {
        template_key: templateKey,
        locale,
        version_id: inserted.id,
        updated_by: user.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "template_key,locale" },
    );
  return inserted;
}

export async function setActiveVersion(templateKey: string, locale: Locale, versionId: string) {
  const { data: user } = await supabase.auth.getUser();
  return (supabase as any)
    .from("email_template_active")
    .upsert(
      {
        template_key: templateKey,
        locale,
        version_id: versionId,
        updated_by: user.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "template_key,locale" },
    );
}