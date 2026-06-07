import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Counts = Record<string, number>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: "soft" | "hard";
  onConfirmed: (counts: Counts) => void;
}

export function DangerResetModal({ open, onOpenChange, level, onConfirmed }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const isHard = level === "hard";
  const canExecute = confirmText === "RESET" && !busy;

  async function handleExecute() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_reset_playground" as any, { level });
      if (error) throw error;
      const counts = ((data as any)?.counts ?? {}) as Counts;
      auditLog({
        action: "admin.reset_playground",
        category: "system",
        entityType: "playground",
        details: { level, counts },
        severity: "critical",
      });
      toast.success(`Reset complete (${level})`);
      onConfirmed(counts);
      setConfirmText("");
      onOpenChange(false);
    } catch (e: any) {
      console.error("[reset] failed", e);
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) setConfirmText(""); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isHard ? "🔥 Confirm Hard Wipe" : "🟡 Confirm Soft Reset"}
          </DialogTitle>
          <DialogDescription>
            {isHard
              ? "Deletes ALL transactional data PLUS supplier brands and company plants. Catalog, companies, users and audit logs are preserved."
              : "Deletes all transactional data (offers, negotiations, orders, requests, notifications). Catalog, companies, users, supplier brands, plants and audit logs are preserved."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Type <span className="font-mono font-bold">RESET</span> to confirm
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            autoFocus
            disabled={busy}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleExecute}
            disabled={!canExecute}
          >
            {busy ? "Executing reset…" : isHard ? "🔥 Execute Hard Wipe" : "🔄 Execute Soft Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}