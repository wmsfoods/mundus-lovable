import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AdminDeleteMode, AdminDeleteResult, AdminEntityType } from "./useAdminDelete";

type Props = {
  open: boolean;
  mode: AdminDeleteMode;
  entityType: AdminEntityType;
  ids: string[];
  onClose: () => void;
  onConfirm: () => Promise<AdminDeleteResult>;
};

export function ConfirmDeleteModal({ open, mode, entityType, ids, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const count = ids.length;

  useEffect(() => { if (open) { setTyped(""); setLoading(false); } }, [open]);

  if (!open) return null;

  const cfg = {
    soft: {
      title: t("admin.dataManagement.confirm.softTitle", "Move to trash"),
      body: t("admin.dataManagement.confirm.softBody", "Will mark {{count}} {{entity}} as deleted. Items will be hidden but can be restored.", { count, entity: entityType }),
      btn: t("admin.dataManagement.confirm.confirm", "Confirm"),
      btnColor: "#5e5e58",
    },
    hard: {
      title: t("admin.dataManagement.confirm.hardTitle", "Hard delete (PERMANENT)"),
      body: t("admin.dataManagement.confirm.hardBody", "Will PERMANENTLY delete {{count}} {{entity}} + cascade children. This action CANNOT be undone.", { count, entity: entityType }),
      btn: t("admin.dataManagement.confirm.confirm", "Confirm"),
      btnColor: "#b3261e",
    },
    restore: {
      title: t("admin.dataManagement.confirm.restoreTitle", "Restore"),
      body: t("admin.dataManagement.confirm.restoreBody", "Will restore {{count}} deleted items.", { count }),
      btn: t("admin.dataManagement.confirm.confirm", "Confirm"),
      btnColor: "#1f6feb",
    },
  }[mode];

  const requireType = mode === "hard";
  const canConfirm = !loading && (!requireType || typed === "DELETE");

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      const r = await onConfirm();
      if (r?.blocked) {
        toast.error(t("admin.dataManagement.toast.blocked", "Blocked: {{reason}}", { reason: r.reason ?? "has active children" }));
      } else {
        const key = mode === "soft" ? "softSuccess" : mode === "hard" ? "hardSuccess" : "restoreSuccess";
        const def = mode === "soft" ? "Moved to trash" : mode === "hard" ? "Permanently deleted" : "Restored";
        toast.success(t(`admin.dataManagement.toast.${key}`, def));
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "white", borderRadius: 8, padding: 20, width: 480, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: mode === "hard" ? "#b3261e" : "#1a1a18" }}>{cfg.title}</h2>
        <p style={{ fontSize: 12, color: "#5e5e58", marginTop: 10 }}>{cfg.body}</p>

        {requireType && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: "#5e5e58", display: "block", marginBottom: 4 }}>
              {t("admin.dataManagement.confirm.hardTypeToConfirm", "Type DELETE to confirm")}
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t("admin.dataManagement.confirm.typeHere", "Type here…")}
              style={{ width: "100%", padding: "6px 10px", fontSize: 12, borderRadius: 5, border: "1px solid rgba(0,0,0,0.15)" }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={{
            padding: "6px 12px", fontSize: 12, borderRadius: 5,
            border: "1px solid rgba(0,0,0,0.15)", background: "white", cursor: "pointer",
          }}>
            {t("admin.dataManagement.confirm.cancel", "Cancel")}
          </button>
          <button onClick={handleConfirm} disabled={!canConfirm} style={{
            padding: "6px 12px", fontSize: 12, borderRadius: 5,
            border: "none", background: cfg.btnColor, color: "white",
            cursor: canConfirm ? "pointer" : "not-allowed", opacity: canConfirm ? 1 : 0.5,
          }}>
            {loading ? "…" : cfg.btn}
          </button>
        </div>
      </div>
    </div>
  );
}