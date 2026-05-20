import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Beef, Upload, Trash2, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { CATEGORY_COLORS, LOCALE_OPTIONS, type AdminCutRow, type CutCategory } from "@/hooks/useAdminCuts";

const CATS: CutCategory[] = ["Beef", "Pork", "Poultry", "Ovine"];

interface Props {
  cut: AdminCutRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (input: { id: string; name: string; product_number: number | null; category: CutCategory; image_url: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadImage: (cutId: string, file: File) => Promise<string>;
  onUpsertTranslation: (input: { cut_id: string; locale: string; name: string }) => Promise<void>;
  onDeleteTranslation: (id: string) => Promise<void>;
  isMutating: boolean;
}

export default function EditCutModal({ cut, open, onOpenChange, onSave, onDelete, onUploadImage, onUpsertTranslation, onDeleteTranslation, isMutating }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [pn, setPn] = useState<string>("");
  const [category, setCategory] = useState<CutCategory>("Beef");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [newLocale, setNewLocale] = useState<string>("");
  const [newLocaleName, setNewLocaleName] = useState("");
  const [trEdits, setTrEdits] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cut) {
      setName(cut.name);
      setPn(cut.product_number != null ? String(cut.product_number) : "");
      setCategory(cut.category);
      setImageUrl(cut.image_url);
      setTrEdits(Object.fromEntries(cut.translations.map((t) => [t.id, t.name])));
      setNewLocale("");
      setNewLocaleName("");
    }
  }, [cut]);

  if (!cut) return null;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await onUploadImage(cut.id, file);
      setImageUrl(url);
      toast.success(t("admin.marketplace.cuts.modal.imageUploaded", { defaultValue: "Image uploaded" }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await onSave({ id: cut.id, name: name.trim(), product_number: pn ? Number(pn) : null, category, image_url: imageUrl });
      // save translation edits that changed
      for (const tr of cut.translations) {
        const val = trEdits[tr.id]?.trim();
        if (val && val !== tr.name) {
          await onUpsertTranslation({ cut_id: cut.id, locale: tr.locale, name: val });
        }
      }
      toast.success(t("admin.marketplace.cuts.modal.saved", { defaultValue: "Cut saved" }));
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const addLocale = async () => {
    if (!newLocale || !newLocaleName.trim()) return;
    try {
      await onUpsertTranslation({ cut_id: cut.id, locale: newLocale, name: newLocaleName.trim() });
      setNewLocale("");
      setNewLocaleName("");
      toast.success(t("admin.marketplace.cuts.modal.translationAdded", { defaultValue: "Translation added" }));
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const removeTranslation = async (id: string) => {
    try {
      await onDeleteTranslation(id);
      toast.success(t("admin.marketplace.cuts.modal.translationRemoved", { defaultValue: "Translation removed" }));
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const availableLocales = LOCALE_OPTIONS.filter((l) => !cut.translations.some((tr) => tr.locale === l.code));
  const c = CATEGORY_COLORS[category];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.marketplace.cuts.modal.title", { defaultValue: "Edit cut" })}</DialogTitle>
          </DialogHeader>

          <div style={{ display: "grid", gap: 14, marginTop: 4 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f && f.type.startsWith("image/")) handleUpload(f);
                }}
                style={{
                  width: 140, height: 140, borderRadius: 12, overflow: "hidden",
                  background: dragOver ? "#EEF2FF" : "#F3F4F6",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  border: `2px dashed ${dragOver ? "#6366F1" : c.border}`,
                  cursor: "pointer", position: "relative", transition: "all 0.15s",
                }}
                title={t("admin.marketplace.cuts.modal.dropHint", { defaultValue: "Click or drag an image here" })}
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {dragOver && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                        {t("admin.marketplace.cuts.modal.dropHere", { defaultValue: "Drop to upload" })}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 8, textAlign: "center" }}>
                    <Upload size={22} color="#9CA3AF" />
                    <span style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.2 }}>
                      {t("admin.marketplace.cuts.modal.dropHint", { defaultValue: "Click or drag an image here" })}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
                <button
                  type="button"
                  className="crm-btn-outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                >
                  <Upload size={14} />
                  {uploading
                    ? t("admin.marketplace.cuts.modal.uploading", { defaultValue: "Uploading..." })
                    : imageUrl
                    ? t("admin.marketplace.cuts.modal.replaceImage", { defaultValue: "Replace image" })
                    : t("admin.marketplace.cuts.modal.uploadImage", { defaultValue: "Upload image" })}
                </button>
                {!imageUrl && (
                  <span style={{ fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>
                    {t("admin.marketplace.cuts.modal.noImage", { defaultValue: "No image yet" })}
                  </span>
                )}
              </div>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{t("admin.marketplace.cuts.modal.name", { defaultValue: "Cut name" })}</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{t("admin.marketplace.cuts.modal.productNumber", { defaultValue: "Product number" })}</span>
                <Input type="number" value={pn} onChange={(e) => setPn(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{t("admin.marketplace.cuts.modal.category", { defaultValue: "Category" })}</span>
                <select className="crm-select" value={category} onChange={(e) => setCategory(e.target.value as CutCategory)}>
                  {CATS.map((cat) => (
                    <option key={cat} value={cat}>{t(`admin.marketplace.cuts.categories.${cat}`, { defaultValue: cat })}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              <strong style={{ fontSize: 13 }}>{t("admin.marketplace.cuts.modal.translations", { defaultValue: "Translations" })}</strong>
              {cut.translations.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>
                  {t("admin.marketplace.cuts.modal.noTranslations", { defaultValue: "No translations yet" })}
                </span>
              )}
              {cut.translations.map((tr) => (
                <div key={tr.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="adm-chip" style={{ minWidth: 70, justifyContent: "center" }}>{tr.locale}</span>
                  <Input value={trEdits[tr.id] ?? ""} onChange={(e) => setTrEdits((p) => ({ ...p, [tr.id]: e.target.value }))} />
                  <button type="button" className="crm-btn-outline" onClick={() => removeTranslation(tr.id)} aria-label="Remove">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {availableLocales.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, paddingTop: 8, borderTop: "1px dashed #e5e7eb" }}>
                  <select className="crm-select" value={newLocale} onChange={(e) => setNewLocale(e.target.value)} style={{ minWidth: 140 }}>
                    <option value="">{t("admin.marketplace.cuts.modal.selectLocale", { defaultValue: "Select locale" })}</option>
                    {availableLocales.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                  <Input
                    placeholder={t("admin.marketplace.cuts.modal.translatedName", { defaultValue: "Translated name" })}
                    value={newLocaleName}
                    onChange={(e) => setNewLocaleName(e.target.value)}
                  />
                  <button type="button" className="crm-btn-outline" onClick={addLocale} disabled={!newLocale || !newLocaleName.trim()}>
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
            <button
              type="button"
              className="crm-btn-outline"
              onClick={() => setConfirmDel(true)}
              style={{ color: "#dc2626", borderColor: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Trash2 size={14} />
              {t("admin.marketplace.cuts.modal.delete", { defaultValue: "Delete" })}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="crm-btn-primary" onClick={handleSave} disabled={isMutating || !name.trim()}>
                {t("common.save")}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.marketplace.cuts.modal.confirmDeleteTitle", { defaultValue: "Delete this cut?" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.marketplace.cuts.modal.confirmDeleteBody", { defaultValue: "This will permanently remove the cut and its translations." })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await onDelete(cut.id);
                  toast.success(t("admin.marketplace.cuts.modal.deleted", { defaultValue: "Cut deleted" }));
                  setConfirmDel(false);
                  onOpenChange(false);
                } catch (e: any) { toast.error(e?.message || "Delete failed"); }
              }}
              style={{ background: "#dc2626" }}
            >
              {t("admin.marketplace.cuts.modal.delete", { defaultValue: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}