import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

/**
 * Supplier-only opt-in: gross up displayed prices so the 0.30 % Mundus fee is
 * embedded in the FINAL price. Buyers never see this flag — they only see the
 * final price.
 */
export function MundusFeeToggle({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.mundusFee.${k}`, { defaultValue: fb }) as string;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <Checkbox
        id="mundus-fee-toggle"
        checked={value}
        onCheckedChange={(c) => onChange(c === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <label htmlFor="mundus-fee-toggle" className="flex flex-1 cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground">
        {tk("label", "Add Mundus fee (0.30%) to your prices?")}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground" onClick={(e) => e.preventDefault()}>
                <Info size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tk(
                "tooltip",
                "When enabled, your asking prices are automatically adjusted so the 0.30% Mundus fee is covered by the final price. Buyers only see the final price.",
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </label>
    </div>
  );
}