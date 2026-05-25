import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CutCategory } from "@/hooks/useAdminCuts";

const CATS: CutCategory[] = ["Beef", "Pork", "Poultry", "Ovine"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (input: {
    name: string;
    product_number: number | null;
    category: CutCategory;
    bone_spec: "Bone-In" | "Boneless" | "Offals";
    unit_weight: "Kg" | "Lb";
    region: "global" | "us";
    imps_number: string | null;
  }) => Promise<string>;
  onUploadImage?: (cutId: string, file: File) => Promise<string>;
  isMutating: boolean;
}

export default function CreateCutModal({ open, onOpenChange, onCreate, onUploadImage, isMutating }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [pn, setPn] = useState("");
  const [category, setCategory] = useState<CutCategory>("Beef");
  const [boneSpec, setBoneSpec] = useState<"Bone-In" | "Boneless" | "Offals">("Boneless");
  const [unitWeight, setUnitWeight] = useState<"Kg" | "Lb">("Kg");
  const [region, setRegion] = useState<"global" | "us">("global");
  const [imps, setImps] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setPn(""); setCategory("Beef"); setBoneSpec("Boneless");
      setUnitWeight("Kg"); setRegion("global"); setImps(""); setImageFile(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (region === "us" && !imps.trim()) { toast.error("IMPS number is required for US cuts"); return; }
    setSaving(true);
    try {
      const id = await onCreate({
        name: name.trim(),
        product_number: pn ? Number(pn) : null,
        category,
        bone_spec: boneSpec,
        unit_weight: unitWeight,
        region,
        imps_number: region === "us" ? imps.trim() : null,
      });
      if (imageFile && onUploadImage) {
        try { await onUploadImage(id, imageFile); } catch (e: any) { toast.error("Created, but image upload failed: " + (e?.message ?? "")); }
      }
      toast.success("Product / Cut created");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add new product / cut</DialogTitle>
        </DialogHeader>

        <div style={{ display: "grid", gap: 14, marginTop: 4 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Product / Cut name *</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ribeye, Striploin..." />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Category</span>
              <select className="crm-select" value={category} onChange={(e) => setCategory(e.target.value as CutCategory)}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Product number</span>
              <Input type="number" value={pn} onChange={(e) => setPn(e.target.value)} placeholder="Optional" />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Region</span>
              <select className="crm-select" value={region} onChange={(e) => setRegion(e.target.value as "global" | "us")}>
                <option value="global">🌐 Global</option>
                <option value="us">🇺🇸 US Beef (IMPS)</option>
              </select>
            </label>
            {region === "us" && (
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>IMPS number *</span>
                <Input value={imps} onChange={(e) => setImps(e.target.value)} placeholder="e.g. 112A" />
              </label>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Bone SPEC</span>
              <select className="crm-select" value={boneSpec} onChange={(e) => setBoneSpec(e.target.value as any)}>
                <option value="Boneless">Boneless</option>
                <option value="Bone-In">Bone-In</option>
                <option value="Offals">Offals</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>Unit weight</span>
              <select className="crm-select" value={unitWeight} onChange={(e) => setUnitWeight(e.target.value as "Kg" | "Lb")}>
                <option value="Kg">Kg</option>
                <option value="Lb">Lb</option>
              </select>
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Image (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: 12 }}
            />
            <span style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>
              You can also upload/replace the image later from the table.
            </span>
          </label>
        </div>

        <DialogFooter style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className="crm-btn-primary" onClick={handleCreate} disabled={saving || isMutating || !name.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> {saving ? "Creating..." : "Create cut"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}