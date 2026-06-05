import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  completion: number;
  submitting?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
};

export function ActionBar({ completion, submitting = false, onSaveDraft, onPublish }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.actionBar.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const publishDisabled = completion < 100 || submitting;
  const draftDisabled = completion === 0 || submitting;

  const handleCancel = () => navigate("/supplier/offers");

  return (
    <div className="sticky bottom-0 -mx-4 mt-8 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <span
        className={cn(
          "mr-auto rounded-full px-3 py-1 text-xs font-semibold",
          completion >= 100 ? "bg-green-100 text-green-800" : completion > 0 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground",
        )}
      >
        {completion >= 100
          ? tk("readyToPublish", "Ready to publish")
          : tk("percentComplete", "{{n}}% complete", { n: completion })}
      </span>
      <Button variant="outline" onClick={handleCancel} disabled={submitting}>
        {tk("cancel", "Cancel")}
      </Button>
      <Button variant="outline" disabled={draftDisabled} onClick={onSaveDraft}>
        {submitting && <Loader2 size={14} className="mr-1 animate-spin" />}
        {tk("saveDraft", "Save draft")}
      </Button>
      <Button disabled={publishDisabled} onClick={onPublish}>
        {submitting && <Loader2 size={14} className="mr-1 animate-spin" />}
        {tk("publish", "Publish")}
      </Button>
    </div>
  );
}