import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SectionStatus } from "@/lib/offerCompletion";

type Props = {
  completion: number;
  submitting?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  mode?: "create" | "edit" | "clone" | "fromRequest";
  missingSections?: SectionStatus[];
  translate?: (key: string, fallback: string, opts?: Record<string, unknown>) => string;
};

export function ActionBar({ completion, submitting = false, onSaveDraft, onPublish, mode = "create", missingSections = [], translate }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.actionBar.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;
  const tg = translate ?? ((k: string, fb: string) => fb);

  const publishDisabled = completion < 100 || submitting;
  const draftDisabled = completion === 0 || submitting;

  const handleCancel = () => navigate("/supplier/offers");
  const isEdit = mode === "edit";

  const publishBtn = (
    <Button disabled={publishDisabled} onClick={onPublish}>
      {submitting && <Loader2 size={14} className="mr-1 animate-spin" />}
      {tk("publish", "Publish")}
    </Button>
  );

  const wrapPublishWithTooltip = (node: React.ReactNode) => {
    if (!publishDisabled || missingSections.length === 0) return node;
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Wrap in span so disabled button still triggers tooltip */}
            <span className="inline-block">{node}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <div className="text-xs">
              <p className="mb-1 font-semibold">{tg("completion.missingToPublish", "Missing to publish:")}</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {missingSections.map((s) => (
                  <li key={s.key}>
                    <span className="font-medium">{tg(s.labelKey, s.key)}</span>:{" "}
                    {s.missingFields.map((k) => tg(k, k.split(".").pop() ?? k)).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
      {isEdit ? (
        <Button disabled={submitting || completion === 0} onClick={onPublish}>
          {submitting && <Loader2 size={14} className="mr-1 animate-spin" />}
          {tk("saveChanges", "Save changes")}
        </Button>
      ) : (
        <>
          <Button variant="outline" disabled={draftDisabled} onClick={onSaveDraft}>
            {submitting && <Loader2 size={14} className="mr-1 animate-spin" />}
            {tk("saveDraft", "Save draft")}
          </Button>
          {wrapPublishWithTooltip(publishBtn)}
        </>
      )}
    </div>
  );
}