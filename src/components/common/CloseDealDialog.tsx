import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface CloseDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  submitting?: boolean;
}

/**
 * Shared confirmation dialog used by both the buyer Offer page and the buyer
 * Negotiation page when the buyer clicks "Close Deal".
 *
 * Copy comes from i18n keys `common.closeDealDialog.{title,body,confirm,cancel}`
 * which are defined in all 5 locales (en, es, fr, pt, zh).
 */
export function CloseDealDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
}: CloseDealDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.closeDealDialog.title")}</DialogTitle>
          <DialogDescription>{t("common.closeDealDialog.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("common.closeDealDialog.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm()}
            disabled={submitting}
          >
            {submitting ? t("common.submitting") : t("common.closeDealDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CloseDealDialog;