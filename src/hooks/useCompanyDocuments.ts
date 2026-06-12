import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { from: (t: string) => any; storage: typeof supabase.storage; rpc: any; functions: typeof supabase.functions };

export type DocCategory = "company_doc" | "certification" | "product_spec";

export type CompanyDocument = {
  id: string;
  company_id: string;
  category: DocCategory;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  cert_type: string | null;
  expires_at: string | null;
  product_category: string | null;
  meat_cut: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const KEY = (companyId: string | undefined, onlyPublished?: boolean) =>
  ["company-documents", companyId, !!onlyPublished] as const;

export function useCompanyDocuments(companyId: string | undefined, opts: { onlyPublished?: boolean } = {}) {
  return useQuery({
    queryKey: KEY(companyId, opts.onlyPublished),
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyDocument[]> => {
      let q = sb.from("company_documents").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (opts.onlyPublished) q = q.eq("is_published", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CompanyDocument[];
    },
  });
}

export function useCompanyHasPublishedDocs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-has-published-docs", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await sb.rpc("company_has_published_documents", { p_company_id: companyId });
      if (error) throw error;
      return data === true;
    },
  });
}

export type UploadInput = {
  file: File;
  companyId: string;
  category: DocCategory;
  title: string;
  description?: string;
  cert_type?: string | null;
  expires_at?: string | null;
  product_category?: string | null;
  meat_cut?: string | null;
  is_published?: boolean;
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export function useUploadCompanyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadInput) => {
      if (input.file.size > MAX_FILE_BYTES) throw new Error("Arquivo excede 10MB");
      if (input.file.type && !ACCEPTED_TYPES.includes(input.file.type))
        throw new Error("Formato inválido (PDF, PNG ou JPG)");
      const ext = input.file.name.split(".").pop() || "bin";
      const safe = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${input.companyId}/${crypto.randomUUID()}-${safe}`;
      const up = await sb.storage.from("company-documents").upload(path, input.file, {
        contentType: input.file.type, upsert: false,
      });
      if (up.error) throw up.error;
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await sb.from("company_documents").insert({
        company_id: input.companyId,
        category: input.category,
        title: input.title,
        name: input.title,
        doc_type: input.cert_type || input.category,
        description: input.description ?? null,
        file_path: path,
        file_url: path,
        file_type: input.file.type,
        mime_type: input.file.type,
        file_size: input.file.size,
        file_size_bytes: input.file.size,
        cert_type: input.cert_type ?? null,
        expires_at: input.expires_at ?? null,
        product_category: input.product_category ?? null,
        meat_cut: input.meat_cut ?? null,
        is_published: !!input.is_published,
        created_by: user?.id ?? null,
        uploaded_by: user?.id ?? null,
      });
      if (error) {
        await sb.storage.from("company-documents").remove([path]).catch(() => {});
        throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["company-documents", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["company-has-published-docs", vars.companyId] });
    },
  });
}

export type UpdateInput = {
  id: string;
  companyId: string;
  patch: Partial<Pick<CompanyDocument, "title" | "description" | "cert_type" | "expires_at" | "product_category" | "meat_cut" | "is_published">>;
  file?: File | null;
  currentPath?: string;
};

export function useUpdateCompanyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      const patch: Record<string, unknown> = { ...input.patch };
      if (patch.title) (patch as any).name = patch.title;
      if (input.file) {
        if (input.file.size > MAX_FILE_BYTES) throw new Error("Arquivo excede 10MB");
        if (input.file.type && !ACCEPTED_TYPES.includes(input.file.type))
          throw new Error("Formato inválido (PDF, PNG ou JPG)");
        const safe = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${input.companyId}/${crypto.randomUUID()}-${safe}`;
        const up = await sb.storage.from("company-documents").upload(path, input.file, {
          contentType: input.file.type, upsert: false,
        });
        if (up.error) throw up.error;
        if (input.currentPath) {
          await sb.storage.from("company-documents").remove([input.currentPath]).catch(() => {});
        }
        patch.file_path = path;
        (patch as any).file_url = path;
        patch.file_type = input.file.type;
        (patch as any).mime_type = input.file.type;
        patch.file_size_bytes = input.file.size;
        (patch as any).file_size = input.file.size;
      }
      const { error } = await sb.from("company_documents").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["company-documents", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["company-has-published-docs", vars.companyId] });
    },
  });
}

export function useDeleteCompanyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; companyId: string; filePath?: string | null }) => {
      const { error } = await sb.from("company_documents").delete().eq("id", input.id);
      if (error) throw error;
      if (input.filePath) {
        await sb.storage.from("company-documents").remove([input.filePath]).catch(() => {});
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["company-documents", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["company-has-published-docs", vars.companyId] });
    },
  });
}

export function useTogglePublishCompanyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; companyId: string; is_published: boolean }) => {
      const { error } = await sb.from("company_documents").update({ is_published: input.is_published }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["company-documents", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["company-has-published-docs", vars.companyId] });
    },
  });
}

export async function getSignedDocumentUrl(docId: string, opts: { download?: boolean } = {}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("sign-company-document", {
    body: { doc_id: docId, download: !!opts.download },
  });
  if (error) throw error;
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("Falha ao gerar link");
  return url;
}