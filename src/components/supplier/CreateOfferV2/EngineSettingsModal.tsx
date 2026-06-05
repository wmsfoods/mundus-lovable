import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import NegotiationHandlingControl, {
  type NegotiationMode,
  type NegotiationDial,
} from "@/components/offer/NegotiationHandlingControl";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  mode: NegotiationMode;
  dial: NegotiationDial;
  onChange: (mode: NegotiationMode, dial: NegotiationDial) => void;
};

export function EngineSettingsModal({ open, onOpenChange, mode, dial, onChange }: Props) {
  const { t } = useTranslation();
  const tk = (k: string, fb: string) =>
    t(`supplier.createOfferV2.engine.${k}`, { defaultValue: fb }) as string;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tk("title", "Negotiation engine")}</DialogTitle>
          <DialogDescription>
            {tk("subtitle", "Choose how counter-offers are handled for this offer.")}
          </DialogDescription>
        </DialogHeader>
        <NegotiationHandlingControl mode={mode} dial={dial} onChange={onChange} />
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{tk("done", "Done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}