import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
};

export function AiQuickFillModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.quickFill.${k}`, { defaultValue: fb }) as string;

  const handleParse = () => {
    toast(tk("comingSoon", "AI Quick-fill is in development — coming soon"));
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tk("title", "AI Quick-fill")}</DialogTitle>
          <DialogDescription>
            {tk("subtitle", "Paste an offer email, spec sheet, or any text — AI will parse and prefill the form.")}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tk("placeholder", "Paste here…")}
          rows={10}
          className="font-mono text-xs"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tk("cancel", "Cancel")}
          </Button>
          <Button onClick={handleParse}>{tk("parse", "Parse")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}