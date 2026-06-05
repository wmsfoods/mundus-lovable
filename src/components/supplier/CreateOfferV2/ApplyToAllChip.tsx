import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  options?: string[];                 // select-style
  freeText?: boolean;                 // input-style (e.g. plant number)
  disabled?: boolean;
  onApply: (value: string) => void;
};

export function ApplyToAllChip({ label, options, freeText, disabled, onApply }: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.cutsTable.applyToAll.${k}`, { defaultValue: fb }) as string;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const apply = (v: string) => {
    if (!v.trim()) return;
    onApply(v);
    setOpen(false);
    setText("");
  };

  return (
    <Popover open={open && !disabled} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
            disabled
              ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-60"
              : "border-border bg-card text-foreground hover:bg-muted/60",
          )}
          title={disabled ? tk("disabledHint", "Add 2+ cuts to enable apply-to-all") : undefined}
        >
          <CopyCheck size={11} />
          {tk("apply", "Apply")} {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {tk("applyToAll", "Apply to all cuts")} · {label}
        </div>
        {options && options.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => apply(o)}
                className="rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
              >
                {o}
              </button>
            ))}
          </div>
        ) : freeText ? (
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              className="h-8 text-xs"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply(text)}
              placeholder={tk("typeValue", "Type value…")}
            />
            <Button size="sm" className="text-xs" onClick={() => apply(text)}>
              {tk("apply", "Apply")}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}