import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Building, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { MockCompany } from "@/data/mockProspect";

type ListRow = { id: string; name: string; record_count: number | null };

type Props = {
  open: boolean;
  onClose: () => void;
  companies: MockCompany[];
  onDone?: () => void;
};

const WINE = "#8B2252";

export function AddToListModal({ open, onClose, companies, onDone }: Props) {
  const { t } = useTranslation();
  const tr = (k: string, v?: Record<string, unknown>) =>
    t(`admin.prospect.lists.${k}`, v as never) as unknown as string;

  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCreating(false); setNewName("");
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("crm_lists")
        .select("id,name,record_count")
        .eq("list_type", "companies")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setLists((data as ListRow[]) ?? []);
      setLoading(false);
    })();
  }, [open]);

  const addTo = async (list: ListRow) => {
    if (!companies.length) return;
    setSaving(true);
    const items = companies.map((c) => ({
      list_id: list.id,
      company_name: c.name,
      domain: c.domain,
      logo_url: c.logo_url,
      industry: c.industry,
      country: c.country,
      city: c.city,
      employees: c.employees,
      revenue: c.revenue,
      founded: String(c.founded ?? ""),
      website: c.website,
      linkedin: c.linkedin,
    }));
    const { error } = await supabase
      .from("crm_list_items")
      .upsert(items, { onConflict: "list_id,domain", ignoreDuplicates: true });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    // refresh count
    const { count } = await supabase
      .from("crm_list_items").select("id", { count: "exact", head: true })
      .eq("list_id", list.id);
    await supabase.from("crm_lists").update({ record_count: count ?? 0 }).eq("id", list.id);
    toast.success(tr("addedToList", { count: companies.length, list: list.name }));
    onDone?.();
    onClose();
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("crm_lists")
      .insert({ name, list_type: "companies" })
      .select("id,name,record_count")
      .single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    addTo(data as ListRow);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{tr("addToList")}</DialogTitle>
        </DialogHeader>

        {!creating ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#6b7280", fontSize: 13 }}>Loading…</div>
            ) : lists.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                <ClipboardList size={24} style={{ margin: "0 auto 6px", display: "block" }} />
                {tr("noLists")}
              </div>
            ) : (
              lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  disabled={saving}
                  onClick={() => addTo(l)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff",
                    cursor: "pointer", textAlign: "left", fontSize: 13,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = WINE)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                >
                  <Building size={16} style={{ color: WINE }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{l.name}</span>
                  <span style={{ color: "#6b7280", fontSize: 11 }}>{l.record_count ?? 0}</span>
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => setCreating(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                border: "1px dashed #d1d5db", borderRadius: 8, background: "transparent",
                color: WINE, fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              <Plus size={14} /> {tr("newList")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{tr("listName")}</label>
            <input
              autoFocus
              className="psp-input"
              placeholder={tr("listName")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
            />
          </div>
        )}

        <DialogFooter>
          {creating ? (
            <>
              <button type="button" className="psp-btn ghost" onClick={() => setCreating(false)}>{tr("cancel")}</button>
              <button
                type="button"
                onClick={createAndAdd}
                disabled={!newName.trim() || saving}
                style={{
                  background: WINE, color: "#fff", border: "none", borderRadius: 6,
                  padding: "8px 14px", fontSize: 12, fontWeight: 600,
                  cursor: !newName.trim() || saving ? "not-allowed" : "pointer",
                  opacity: !newName.trim() || saving ? 0.6 : 1,
                }}
              >
                {tr("createList")}
              </button>
            </>
          ) : (
            <button type="button" className="psp-btn ghost" onClick={onClose}>{tr("cancel")}</button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}