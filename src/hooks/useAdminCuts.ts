import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CutCategory = "Beef" | "Pork" | "Poultry" | "Ovine";

export type CutTranslation = {
  id: string;
  cut_id: string;
  locale: string;
  name: string;
};

export type AdminCutRow = {
  id: string;
  name: string;
  product_number: number | null;
  category: CutCategory;
  image_url: string | null;
  is_active: boolean;
  bone_spec: "Bone-In" | "Boneless";
  translations: CutTranslation[];
};

export function useAdminCuts() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin", "cuts"],
    queryFn: async () => {
      const [cutsRes, trRes] = await Promise.all([
        supabase.from("cuts").select("id, name, product_number, category, image_url, is_active, bone_spec").order("category").order("name"),
        supabase.from("cut_translations").select("id, cut_id, locale, name"),
      ]);
      if (cutsRes.error) throw cutsRes.error;
      if (trRes.error) throw trRes.error;
      const trByCut = new Map<string, CutTranslation[]>();
      for (const t of (trRes.data ?? []) as CutTranslation[]) {
        const arr = trByCut.get(t.cut_id) ?? [];
        arr.push(t);
        trByCut.set(t.cut_id, arr);
      }
      const rows: AdminCutRow[] = ((cutsRes.data ?? []) as any[]).map((c) => ({
        id: c.id,
        name: c.name,
        product_number: c.product_number,
        category: c.category as CutCategory,
        image_url: c.image_url,
        is_active: !!c.is_active,
        bone_spec: (c.bone_spec === "Bone-In" ? "Bone-In" : "Boneless"),
        translations: trByCut.get(c.id) ?? [],
      }));
      return {
        rows,
        total: rows.length,
        active: rows.filter((r) => r.is_active).length,
        translationsCount: (trRes.data ?? []).length,
      };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("cuts").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cuts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; name: string; product_number: number | null; category: CutCategory; image_url: string | null; bone_spec: "Bone-In" | "Boneless" }) => {
      const { error } = await supabase
        .from("cuts")
        .update({ name: input.name, product_number: input.product_number, category: input.category, image_url: input.image_url, bone_spec: input.bone_spec })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cuts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cuts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cuts"] }),
  });

  const upsertTranslationMutation = useMutation({
    mutationFn: async (input: { cut_id: string; locale: string; name: string }) => {
      const { error } = await supabase
        .from("cut_translations")
        .upsert({ cut_id: input.cut_id, locale: input.locale, name: input.name }, { onConflict: "cut_id,locale" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cuts"] }),
  });

  const deleteTranslationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cut_translations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cuts"] }),
  });

  const uploadImage = async (cutId: string, file: File): Promise<string> => {
    // Resize + convert to WebP in the browser before hitting storage.
    const { compressImage } = await import("@/lib/imageOptimization");
    const optimized = await compressImage(file, { maxSize: 1280, quality: 0.82 });
    const ext = (optimized.name.split(".").pop() || "webp").toLowerCase();
    const path = `${cutId}.${ext}`;
    const { error: upErr } = await supabase.storage.from("cut-images").upload(path, optimized, {
      upsert: true,
      contentType: optimized.type,
      cacheControl: "2592000", // 30 days
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("cut-images").getPublicUrl(path);
    // Tie cache to file size so the URL only changes when the asset changes.
    const url = `${data.publicUrl}?s=${optimized.size}`;
    const { error: updErr } = await supabase.from("cuts").update({ image_url: url }).eq("id", cutId);
    if (updErr) throw updErr;
    qc.invalidateQueries({ queryKey: ["admin", "cuts"] });
    return url;
  };

  return {
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    active: query.data?.active ?? 0,
    translationsCount: query.data?.translationsCount ?? 0,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    toggleCutActive: (id: string, isActive: boolean) => toggleMutation.mutateAsync({ id, isActive }),
    updateCut: (input: { id: string; name: string; product_number: number | null; category: CutCategory; image_url: string | null; bone_spec: "Bone-In" | "Boneless" }) => updateMutation.mutateAsync(input),
    deleteCut: (id: string) => deleteMutation.mutateAsync(id),
    upsertTranslation: (input: { cut_id: string; locale: string; name: string }) => upsertTranslationMutation.mutateAsync(input),
    deleteTranslation: (id: string) => deleteTranslationMutation.mutateAsync(id),
    uploadCutImage: uploadImage,
    isMutating: updateMutation.isPending || deleteMutation.isPending || upsertTranslationMutation.isPending || deleteTranslationMutation.isPending,
  };
}

export const CATEGORY_COLORS: Record<CutCategory, { bg: string; text: string; border: string }> = {
  Beef: { bg: "#FBEAF0", text: "#72243E", border: "#F4C0D1" },
  Pork: { bg: "#FAEEDA", text: "#633806", border: "#FAC775" },
  Poultry: { bg: "#E6F1FB", text: "#0C447C", border: "#85B7EB" },
  Ovine: { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5" },
};

export const LOCALE_OPTIONS = [
  { code: "pt-BR", label: "Português (BR)" },
  { code: "es-ES", label: "Español (ES)" },
  { code: "zh-CN", label: "中文 (CN)" },
  { code: "ar-SA", label: "العربية (SA)" },
];