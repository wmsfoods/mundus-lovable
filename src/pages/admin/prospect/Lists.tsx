import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus, Building, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

const WINE = "#8B2252";

type ListRow = {
  id: string;
  name: string;
  record_count: number | null;
  created_at: string;
};

export default function ProspectLists() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const tr = (k: string, v?: Record<string, unknown>) =>
    t(`admin.prospect.lists.${k}`, v as never) as unknown as string;

  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_lists")
      .select("id,name,record_count,created_at")
      .eq("list_type", "companies")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    // Recompute counts (in case stale)
    const list = (data as ListRow[]) ?? [];
    if (list.length) {
      const { data: counts } = await supabase
        .from("crm_list_items")
        .select("list_id")
        .in("list_id", list.map((l) => l.id));
      const tally = new Map<string, number>();
      (counts ?? []).forEach((c: { list_id: string }) => tally.set(c.list_id, (tally.get(c.list_id) ?? 0) + 1));
      list.forEach((l) => { l.record_count = tally.get(l.id) ?? 0; });
    }
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const { error } = await supabase
      .from("crm_lists")
      .insert({ name, list_type: "companies" });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("createList"));
    setNewName(""); setShowModal(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const { error } = await supabase.from("crm_lists").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("deleted"));
    load();
  };

  const fmtDate = (iso: string) => {
    try { return new Intl.DateTimeFormat(i18n.language || "en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso)); }
    catch { return iso; }
  };

  return (
    <div className="psp-page">
      <div className="psp-toolbar">
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{tr("title")}</div>
        <button
          className="psp-btn solid"
          onClick={() => setShowModal(true)}
          style={{ background: WINE, borderColor: WINE }}
        >
          <Plus size={12} /> {tr("newList")}
        </button>
      </div>

      {loading ? (
        <div className="psp-empty" style={{ padding: 60 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="psp-empty" style={{ padding: 80 }}>
          <ClipboardList size={32} style={{ margin: "0 auto 12px", display: "block", color: "var(--adm-text-tertiary)" }} />
          <p style={{ marginBottom: 4, fontWeight: 600, color: "var(--adm-text)" }}>{tr("noLists")}</p>
          <p>{tr("noListsDesc")}</p>
        </div>
      ) : (
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, overflowY: "auto" }}>
          {rows.map((l) => (
            <div
              key={l.id}
              onClick={() => nav(`/admin/prospect/lists/${l.id}`)}
              style={{
                background: "#fff", border: "1px solid var(--adm-border, #e5e7eb)",
                borderRadius: 10, padding: 14, cursor: "pointer",
                transition: "border-color 120ms, box-shadow 120ms",
                display: "flex", flexDirection: "column", gap: 8, position: "relative",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = WINE; e.currentTarget.style.boxShadow = "0 2px 10px rgba(139,34,82,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--adm-border, #e5e7eb)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, background: `${WINE}15`, color: WINE,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Building size={16} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--adm-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: "var(--adm-text-tertiary)" }}>{tr("companies")}</div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="More"
                        style={{ background: "transparent", border: "none", padding: 4, borderRadius: 4, cursor: "pointer", color: "#6b7280" }}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDeleteId(l.id)} style={{ color: "#dc2626" }}>
                        <Trash2 size={12} style={{ marginRight: 6 }} /> {tr("deleteList")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--adm-text-tertiary)" }}>
                <span>{tr("itemCount", { count: l.record_count ?? 0 })}</span>
                <span>{tr("created", { date: fmtDate(l.created_at) })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New List modal */}
      <Dialog open={showModal} onOpenChange={(o) => { if (!o) { setShowModal(false); setNewName(""); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{tr("newList")}</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              border: `2px solid ${WINE}`, borderRadius: 8, background: `${WINE}08`,
            }}>
              <Building size={16} style={{ color: WINE }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: WINE }}>{tr("companies")}</span>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                {tr("listName")}
              </label>
              <input
                autoFocus
                className="psp-input"
                placeholder={tr("listName")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </div>
          </div>
          <DialogFooter>
            <button type="button" className="psp-btn ghost" onClick={() => { setShowModal(false); setNewName(""); }}>
              {tr("cancel")}
            </button>
            <button
              type="button"
              onClick={create}
              disabled={!newName.trim() || creating}
              style={{
                background: WINE, color: "#fff", border: "none", borderRadius: 6,
                padding: "8px 16px", fontSize: 12, fontWeight: 600,
                cursor: !newName.trim() || creating ? "not-allowed" : "pointer",
                opacity: !newName.trim() || creating ? 0.6 : 1,
              }}
            >
              {tr("createList")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("deleteList")}</AlertDialogTitle>
            <AlertDialogDescription>{tr("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} style={{ background: "#dc2626" }}>
              {tr("deleteList")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}