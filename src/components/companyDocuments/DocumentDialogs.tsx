import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadIcon, FileIcon, XIcon } from "@/components/icons";
import { loadCutsByRegionAndCategory, type CutItem } from "@/data/cutsData";
import {
  CERT_TYPES, PRODUCT_CATEGORIES, PRODUCT_CATEGORY_TO_CUTS,
  type CertType, type ProductCategory, formatBytes,
} from "./types";
import {
  ACCEPTED_TYPES, MAX_FILE_BYTES,
  useUploadCompanyDocument, useUpdateCompanyDocument,
  type CompanyDocument, type DocCategory,
} from "@/hooks/useCompanyDocuments";
import { toast } from "sonner";

type CommonState = {
  title: string;
  description: string;
  cert_type: CertType | "";
  expires_at: string;
  product_category: ProductCategory | "";
  meat_cut: string;
  is_published: boolean;
  file: File | null;
};

function emptyState(): CommonState {
  return {
    title: "", description: "", cert_type: "", expires_at: "",
    product_category: "", meat_cut: "", is_published: false, file: null,
  };
}

function FileDrop({ file, onPick, currentName, currentSize }: {
  file: File | null;
  onPick: (f: File | null) => void;
  currentName?: string | null;
  currentSize?: number | null;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = (list: FileList | null) => {
    if (!list || !list.length) return;
    const f = list[0];
    if (f.size > MAX_FILE_BYTES) { toast.error(t("companyDocuments.upload.tooLarge", "File exceeds 10 MB")); return; }
    if (f.type && !ACCEPTED_TYPES.includes(f.type)) { toast.error(t("companyDocuments.upload.invalidType", "Use PDF, PNG or JPG")); return; }
    onPick(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${drag ? "border-[#B64769] bg-[#B64769]/5" : "border-border bg-muted/30"}`}
    >
      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => handle(e.target.files)} />
      <UploadIcon size={28} className="mx-auto mb-2 text-muted-foreground" />
      <div className="text-sm font-medium">{t("companyDocuments.upload.choose", "Choose a file or drag and drop it here")}</div>
      <div className="text-xs text-muted-foreground mt-1">{t("companyDocuments.upload.formats", "PDF, PNG or JPG · max 10 MB")}</div>
      {(file || currentName) && (
        <div className="mt-3 inline-flex items-center gap-2 text-xs bg-background border rounded-md px-2 py-1" onClick={(e) => e.stopPropagation()}>
          <FileIcon size={14} className="text-[#B64769]" />
          <span className="font-medium truncate max-w-[220px]">{file ? file.name : currentName}</span>
          <span className="text-muted-foreground">· {formatBytes(file ? file.size : currentSize ?? null)}</span>
          {file && (
            <button type="button" onClick={() => onPick(null)} className="text-muted-foreground hover:text-foreground" aria-label="Remove">
              <XIcon size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryFields({
  category, state, setState, cuts,
}: {
  category: DocCategory;
  state: CommonState;
  setState: (s: CommonState) => void;
  cuts: CutItem[];
}) {
  const { t } = useTranslation();
  if (category === "certification") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>{t("companyDocuments.fields.certType", "Certification Type")} *</Label>
          <Select value={state.cert_type} onValueChange={(v) => setState({ ...state, cert_type: v as CertType })}>
            <SelectTrigger><SelectValue placeholder={t("common.select", "Select…")} /></SelectTrigger>
            <SelectContent>{CERT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("companyDocuments.fields.expiresAt", "Expiry Date")}</Label>
          <Input type="date" value={state.expires_at} onChange={(e) => setState({ ...state, expires_at: e.target.value })} />
        </div>
      </div>
    );
  }
  if (category === "product_spec") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>{t("companyDocuments.fields.productCategory", "Product Category")} *</Label>
          <Select value={state.product_category} onValueChange={(v) => setState({ ...state, product_category: v as ProductCategory, meat_cut: "" })}>
            <SelectTrigger><SelectValue placeholder={t("common.select", "Select…")} /></SelectTrigger>
            <SelectContent>{PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("companyDocuments.fields.meatCut", "Cut")}</Label>
          <Select value={state.meat_cut} onValueChange={(v) => setState({ ...state, meat_cut: v })} disabled={!state.product_category}>
            <SelectTrigger><SelectValue placeholder={state.product_category ? t("common.select", "Select…") : t("companyDocuments.fields.selectCategoryFirst", "Select a category first")} /></SelectTrigger>
            <SelectContent className="max-h-72">
              {cuts.map((c) => <SelectItem key={c.id} value={c.displayName}>{c.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }
  return null;
}

export function UploadDocumentDialog({
  open, onOpenChange, companyId, category,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  category: DocCategory;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<CommonState>(emptyState());
  const [cuts, setCuts] = useState<CutItem[]>([]);
  const upload = useUploadCompanyDocument();

  useEffect(() => { if (open) setState(emptyState()); }, [open, category]);

  useEffect(() => {
    if (category !== "product_spec" || !state.product_category) { setCuts([]); return; }
    void loadCutsByRegionAndCategory(PRODUCT_CATEGORY_TO_CUTS[state.product_category], "global").then(setCuts);
  }, [category, state.product_category]);

  const canSubmit = useMemo(() => {
    if (!state.file || !state.title.trim()) return false;
    if (category === "certification" && !state.cert_type) return false;
    if (category === "product_spec" && !state.product_category) return false;
    return true;
  }, [state, category]);

  const submit = async () => {
    if (!state.file) return;
    try {
      await upload.mutateAsync({
        file: state.file, companyId, category, title: state.title.trim(),
        description: state.description.trim() || undefined,
        cert_type: category === "certification" ? state.cert_type || null : null,
        expires_at: category === "certification" ? state.expires_at || null : null,
        product_category: category === "product_spec" ? state.product_category || null : null,
        meat_cut: category === "product_spec" ? state.meat_cut || null : null,
        is_published: state.is_published,
      });
      toast.success(t("companyDocuments.upload.success", "Document uploaded"));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || t("companyDocuments.upload.error", "Upload failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("companyDocuments.upload.title", "Upload Document")}</DialogTitle>
          <DialogDescription>{t(`companyDocuments.tabs.${category}`, category)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FileDrop file={state.file} onPick={(f) => setState({ ...state, file: f })} />
          <div>
            <Label>{t("companyDocuments.fields.title", "Title")} *</Label>
            <Input value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />
          </div>
          <div>
            <Label>{t("companyDocuments.fields.description", "Description")}</Label>
            <Textarea
              rows={3}
              placeholder={t("companyDocuments.fields.descriptionPh", "Short context buyers will read under the title…")}
              value={state.description}
              onChange={(e) => setState({ ...state, description: e.target.value })}
            />
          </div>
          <CategoryFields category={category} state={state} setState={setState} cuts={cuts} />
          <div className="flex items-start gap-3 pt-1">
            <Switch checked={state.is_published} onCheckedChange={(v) => setState({ ...state, is_published: v })} />
            <div>
              <div className="text-sm font-medium">{t("companyDocuments.fields.visible", "Visible to buyers")}</div>
              <div className="text-xs text-muted-foreground">
                {t("companyDocuments.fields.visibleHelp", "Unpublished documents stay as drafts only your team can see.")}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSubmit || upload.isPending} style={{ background: "#B64769" }}>
            {upload.isPending ? t("common.uploading", "Uploading…") : t("companyDocuments.upload.submit", "Upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditDocumentDialog({
  open, onOpenChange, companyId, document,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  document: CompanyDocument | null;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<CommonState>(emptyState());
  const [cuts, setCuts] = useState<CutItem[]>([]);
  const update = useUpdateCompanyDocument();

  useEffect(() => {
    if (open && document) {
      const pc = (PRODUCT_CATEGORIES as readonly string[]).includes(document.product_category || "")
        ? (document.product_category as ProductCategory) : "";
      setState({
        title: document.title || "",
        description: document.description || "",
        cert_type: (document.cert_type as CertType) || "",
        expires_at: document.expires_at || "",
        product_category: pc,
        meat_cut: document.meat_cut || "",
        is_published: document.is_published,
        file: null,
      });
    }
  }, [open, document]);

  useEffect(() => {
    if (!document || document.category !== "product_spec" || !state.product_category) { setCuts([]); return; }
    void loadCutsByRegionAndCategory(PRODUCT_CATEGORY_TO_CUTS[state.product_category], "global").then(setCuts);
  }, [document, state.product_category]);

  if (!document) return null;
  const category = document.category;

  const submit = async () => {
    try {
      await update.mutateAsync({
        id: document.id,
        companyId,
        currentPath: document.file_path,
        file: state.file,
        patch: {
          title: state.title.trim(),
          description: state.description.trim() || null,
          cert_type: category === "certification" ? state.cert_type || null : null,
          expires_at: category === "certification" ? state.expires_at || null : null,
          product_category: category === "product_spec" ? state.product_category || null : null,
          meat_cut: category === "product_spec" ? state.meat_cut || null : null,
          is_published: state.is_published,
        },
      });
      toast.success(t("companyDocuments.edit.success", "Document updated"));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || t("companyDocuments.edit.error", "Update failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("companyDocuments.edit.title", "Edit Document")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FileDrop
            file={state.file}
            onPick={(f) => setState({ ...state, file: f })}
            currentName={state.file ? null : document.title}
            currentSize={document.file_size_bytes}
          />
          <div>
            <Label>{t("companyDocuments.fields.title", "Title")} *</Label>
            <Input value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} />
          </div>
          <div>
            <Label>{t("companyDocuments.fields.description", "Description")}</Label>
            <Textarea rows={3} value={state.description} onChange={(e) => setState({ ...state, description: e.target.value })} />
          </div>
          <CategoryFields category={category} state={state} setState={setState} cuts={cuts} />
          <div className="flex items-start gap-3 pt-1">
            <Switch checked={state.is_published} onCheckedChange={(v) => setState({ ...state, is_published: v })} />
            <div>
              <div className="text-sm font-medium">{t("companyDocuments.fields.visible", "Visible to buyers")}</div>
              <div className="text-xs text-muted-foreground">
                {t("companyDocuments.fields.visibleHelp", "Unpublished documents stay as drafts only your team can see.")}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={submit} disabled={update.isPending || !state.title.trim()} style={{ background: "#B64769" }}>
            {update.isPending ? t("common.saving", "Saving…") : t("common.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}