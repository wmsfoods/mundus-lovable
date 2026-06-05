import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Star, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type Brand = {
  id: string;
  name: string;
  is_default: boolean;
  company_id: string;
};

type Props = {
  companyId: string;
  canEdit: boolean;
};

export default function SupplierBrandsManager({ companyId, canEdit }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.brands.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const brandsQuery = useQuery<Brand[]>({
    queryKey: ["supplier_brands", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_brands")
        .select("id, name, is_default, company_id")
        .eq("company_id", companyId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["supplier_brands", companyId] });

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDefault, setNewDefault] = useState(false);

  const addMutation = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error(tk("validation.nameRequired", "Name is required"));
      const { error } = await supabase.from("supplier_brands").insert({
        company_id: companyId,
        name,
        is_default: newDefault,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tk("toast.created", "Brand added"));
      setAddOpen(false);
      setNewName("");
      setNewDefault(false);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Edit row (inline)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error(tk("validation.nameRequired", "Name is required"));
      const { error } = await supabase
        .from("supplier_brands")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tk("toast.updated", "Brand updated"));
      setEditingId(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Set default
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_brands")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tk("toast.defaultSet", "Default brand updated"));
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tk("toast.deleted", "Brand deleted"));
      setDeleteId(null);
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const brands = brandsQuery.data ?? [];
  const deleteTarget = brands.find((b) => b.id === deleteId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {brandsQuery.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          {tk("loading", "Loading brands…")}
        </div>
      )}

      {!brandsQuery.isLoading && brands.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
          {tk("empty", "No brands yet. Add your first brand to display it on offer items.")}
        </p>
      )}

      {brands.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {brands.map((b) => {
            const editing = editingId === b.id;
            return (
              <li
                key={b.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                {editing ? (
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 max-w-xs text-sm"
                  />
                ) : (
                  <span className="flex-1 truncate font-medium text-foreground">{b.name}</span>
                )}
                {!editing && b.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                    <Star size={10} fill="currentColor" />
                    {tk("defaultBadge", "Default")}
                  </span>
                )}
                {canEdit && (
                  <div className="ml-auto flex items-center gap-1">
                    {editing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: b.id, name: editName })}
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X size={14} />
                        </Button>
                      </>
                    ) : (
                      <>
                        {!b.is_default && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            title={tk("setDefault", "Set as default")}
                            disabled={setDefaultMutation.isPending}
                            onClick={() => setDefaultMutation.mutate(b.id)}
                          >
                            <Star size={14} />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          title={tk("editTitle", "Rename brand")}
                          onClick={() => {
                            setEditingId(b.id);
                            setEditName(b.name);
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          title={tk("delete.title", "Delete brand")}
                          onClick={() => setDeleteId(b.id)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />
            {tk("addBrand", "Add brand")}
          </Button>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tk("addBrand", "Add brand")}</DialogTitle>
            <DialogDescription>
              {tk("addHint", "Brands are shown next to each cut on your offers.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {tk("brandName", "Brand name")}
              </label>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={tk("brandNamePh", "e.g. Premium Cut")}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newDefault}
                onChange={(e) => setNewDefault(e.target.checked)}
              />
              {tk("setDefault", "Set as default")}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              {tk("delete.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              disabled={addMutation.isPending || newName.trim().length === 0}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending
                ? tk("saving", "Saving…")
                : tk("save", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tk("delete.title", "Delete brand")}</DialogTitle>
            <DialogDescription>
              {tk("delete.confirm", "Remove \"{{name}}\" from this company's brands? Offer items already using it will keep the link.", { name: deleteTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              {tk("delete.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending
                ? tk("delete.deleting", "Deleting…")
                : tk("delete.confirmCta", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}