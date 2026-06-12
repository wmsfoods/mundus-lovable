import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useCompanyDocuments, useDeleteCompanyDocument, useTogglePublishCompanyDocument,
  type CompanyDocument, type DocCategory,
} from "@/hooks/useCompanyDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, Search, LayoutGrid, List, Pencil, Trash2, EyeOff, Eye, Loader2,
} from "lucide-react";
import { ExpiryBadge } from "./ExpiryBadge";
import { UploadDocumentDialog, EditDocumentDialog } from "./DocumentDialogs";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";
import { formatBytes, fileTypeLabel } from "./types";
import { toast } from "sonner";

const TABS: { key: DocCategory; tKey: string; fallback: string }[] = [
  { key: "company_doc", tKey: "companyDocuments.tabs.company_doc", fallback: "Company Documents" },
  { key: "certification", tKey: "companyDocuments.tabs.certification", fallback: "Certifications" },
  { key: "product_spec", tKey: "companyDocuments.tabs.product_spec", fallback: "Product Specs" },
];

type Props = { companyId: string; canManage: boolean; titleOverride?: string };

export function DocumentCenter({ companyId, canManage, titleOverride }: Props) {
  const { t, i18n } = useTranslation();
  const { data: docs = [], isLoading } = useCompanyDocuments(companyId);
  const del = useDeleteCompanyDocument();
  const togglePub = useTogglePublishCompanyDocument();

  const [tab, setTab] = useState<DocCategory>("company_doc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDocument | null>(null);
  const [preview, setPreview] = useState<CompanyDocument | null>(null);
  const [confirmDel, setConfirmDel] = useState<CompanyDocument | null>(null);

  const counts = useMemo(() => {
    return TABS.reduce<Record<DocCategory, number>>((acc, t) => {
      acc[t.key] = docs.filter((d) => d.category === t.key).length;
      return acc;
    }, { company_doc: 0, certification: 0, product_spec: 0 });
  }, [docs]);

  const filtered = useMemo(() => {
    const list = docs.filter((d) => d.category === tab);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) =>
      d.title?.toLowerCase().includes(q) ||
      d.cert_type?.toLowerCase().includes(q) ||
      d.file_type?.toLowerCase().includes(q),
    );
  }, [docs, tab, search]);

  const publishedVisible = filtered.filter((d) => d.is_published).length;

  const onDelete = async () => {
    if (!confirmDel) return;
    try {
      await del.mutateAsync({ id: confirmDel.id, companyId, filePath: confirmDel.file_path });
      toast.success(t("companyDocuments.actions.deleted", "Document deleted"));
      setConfirmDel(null);
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const onTogglePublish = async (d: CompanyDocument, value: boolean) => {
    try { await togglePub.mutateAsync({ id: d.id, companyId, is_published: value }); }
    catch (e: any) { toast.error(e?.message || "Update failed"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {titleOverride || t("companyDocuments.title", "Documents & Specs")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {t("companyDocuments.subtitle", "Your company library — certifications and product spec sheets buyers see before they negotiate.")}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setUploadOpen(true)} style={{ background: "#B64769" }} className="h-11 min-h-11">
            <Plus className="h-4 w-4" /> {t("companyDocuments.upload.button", "Upload Document")}
          </Button>
        )}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as DocCategory)}>
        <TabsList className="bg-muted/50 h-auto p-1 flex-wrap">
          {TABS.map((tt) => (
            <TabsTrigger key={tt.key} value={tt.key} className="min-h-11 gap-2 data-[state=active]:bg-background">
              {t(tt.tKey, tt.fallback)}
              <Badge variant="secondary" className="rounded-full px-2 py-0">{counts[tt.key]}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("companyDocuments.toolbar.search", "Filter by title or type…")}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex border rounded-md overflow-hidden">
            <Button variant={view === "grid" ? "default" : "ghost"} size="sm" onClick={() => setView("grid")} className="rounded-none h-9" style={view === "grid" ? { background: "#B64769" } : undefined}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "default" : "ghost"} size="sm" onClick={() => setView("list")} className="rounded-none h-9" style={view === "list" ? { background: "#B64769" } : undefined}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {t("companyDocuments.toolbar.counter", { visible: publishedVisible, total: filtered.length, defaultValue: `${publishedVisible} of ${filtered.length} visible to buyers` })}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed rounded-lg py-12 text-center text-sm text-muted-foreground">
          {t("companyDocuments.empty", "No documents yet.")}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((d) => (
            <DocCard key={d.id} d={d} canManage={canManage}
              onPreview={() => setPreview(d)} onEdit={() => setEditing(d)}
              onDelete={() => setConfirmDel(d)} onTogglePublish={(v) => onTogglePublish(d, v)}
              locale={i18n.language}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y border rounded-lg bg-card">
          {filtered.map((d) => (
            <DocRow key={d.id} d={d} canManage={canManage}
              onPreview={() => setPreview(d)} onEdit={() => setEditing(d)}
              onDelete={() => setConfirmDel(d)} onTogglePublish={(v) => onTogglePublish(d, v)}
              locale={i18n.language}
            />
          ))}
        </div>
      )}

      {canManage && (
        <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} companyId={companyId} category={tab} />
      )}
      {canManage && (
        <EditDocumentDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} companyId={companyId} document={editing} />
      )}
      <DocumentPreviewDialog doc={preview} onClose={() => setPreview(null)} />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("companyDocuments.confirmDelete.title", "Delete document?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("companyDocuments.confirmDelete.body", "This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DocBadges({ d }: { d: CompanyDocument }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {d.category === "certification" && d.cert_type && (
        <Badge variant="outline" className="border-[#B64769]/30 text-[#B64769]">{d.cert_type}</Badge>
      )}
      {d.category === "certification" && <ExpiryBadge expiresAt={d.expires_at} />}
      {d.category === "product_spec" && d.product_category && (
        <Badge variant="outline">{d.product_category}</Badge>
      )}
      {d.category === "product_spec" && d.meat_cut && (
        <Badge variant="secondary" className="font-normal">{d.meat_cut}</Badge>
      )}
    </div>
  );
}

function MetaLine({ d, locale }: { d: CompanyDocument; locale?: string }) {
  const date = new Date(d.created_at).toLocaleDateString(locale || undefined, { year: "numeric", month: "short", day: "2-digit" });
  return (
    <div className="text-xs text-muted-foreground">
      {date} · {formatBytes(d.file_size_bytes)} · {fileTypeLabel(d.file_type)}
    </div>
  );
}

function DocCard({
  d, canManage, onPreview, onEdit, onDelete, onTogglePublish, locale,
}: {
  d: CompanyDocument; canManage: boolean;
  onPreview: () => void; onEdit: () => void; onDelete: () => void;
  onTogglePublish: (v: boolean) => void; locale?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={`rounded-lg border bg-card p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow ${!d.is_published ? "border-dashed" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-[#B64769]/10 text-[#B64769] flex items-center justify-center shrink-0">
          {d.is_published ? <FileText className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <button onClick={onPreview} className="font-medium text-sm text-left hover:underline truncate block w-full">{d.title}</button>
          {d.description && <div className="text-xs text-muted-foreground line-clamp-2">{d.description}</div>}
          <div className="mt-1"><MetaLine d={d} locale={locale} /></div>
        </div>
      </div>
      <DocBadges d={d} />
      {!d.is_published && (
        <Badge variant="outline" className="self-start border-amber-200 bg-amber-50 text-amber-700">
          <EyeOff className="h-3 w-3 mr-1" /> {t("companyDocuments.badge.draft", "Draft")}
        </Badge>
      )}
      {canManage && (
        <div className="flex items-center justify-between pt-1 border-t mt-1">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch checked={d.is_published} onCheckedChange={onTogglePublish} />
            <span>{d.is_published ? t("companyDocuments.fields.visibleShort", "Visible") : t("companyDocuments.badge.draft", "Draft")}</span>
          </label>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={onDelete} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({
  d, canManage, onPreview, onEdit, onDelete, onTogglePublish, locale,
}: {
  d: CompanyDocument; canManage: boolean;
  onPreview: () => void; onEdit: () => void; onDelete: () => void;
  onTogglePublish: (v: boolean) => void; locale?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
      <div className="h-10 w-10 rounded-md bg-[#B64769]/10 text-[#B64769] flex items-center justify-center shrink-0">
        {d.is_published ? <FileText className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <button onClick={onPreview} className="font-medium text-sm text-left hover:underline truncate block">{d.title}</button>
        <MetaLine d={d} locale={locale} />
      </div>
      <DocBadges d={d} />
      {!d.is_published && (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          <EyeOff className="h-3 w-3 mr-1" /> {t("companyDocuments.badge.draft", "Draft")}
        </Badge>
      )}
      {canManage && (
        <div className="flex items-center gap-1">
          <Switch checked={d.is_published} onCheckedChange={onTogglePublish} />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}