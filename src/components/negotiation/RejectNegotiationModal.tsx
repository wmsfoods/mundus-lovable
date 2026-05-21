import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";

export interface RejectNegotiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiation: RealNegotiationRow;
  onRejected?: () => void;
}

const REASONS = [
  "price_too_low",
  "terms_unacceptable",
  "product_unavailable",
  "timeline_conflict",
  "other",
] as const;

export function RejectNegotiationModal({
  open,
  onOpenChange,
  negotiation,
  onRejected,
}: RejectNegotiationModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason(REASONS[0]);
      setNotes("");
    }
  }, [open]);

  async function handleReject() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("negotiations")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          status: "offer_rejected",
          rejection_reason: reason,
          rejection_notes: notes.trim() ? notes.trim() : null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", negotiation.id);
      if (error) throw error;
      toast.success(t("negotiation.reject.successToast", "Negotiation rejected"));
      onOpenChange(false);
      onRejected?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] sm:rounded-lg max-sm:!max-w-full max-sm:!max-h-[100dvh] max-sm:!h-auto max-sm:!rounded-none max-sm:!m-0">
        <DialogHeader>
          <DialogTitle>{t("negotiation.reject.title", "Reject Negotiation")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">
              {t("negotiation.reject.reasonLabel", "Reason")}
            </span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`negotiation.reject.reasons.${r}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">
              {t("negotiation.reject.notesLabel", "Notes (optional)")}
            </span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("negotiation.reject.notesPlaceholder", "Add context for the other party…")}
              className="min-h-[88px]"
            />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("negotiation.reject.cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={submitting}
          >
            {submitting
              ? t("negotiation.reject.submitting", "Rejecting…")
              : t("negotiation.reject.confirm", "Reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RejectNegotiationModal;