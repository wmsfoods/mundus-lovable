import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  mode: "new" | "edit";
  cutName?: string;
};

/**
 * Phase 1A placeholder — full cut editor lands in Phase 1C.
 */
export function CutSheetMobile({ open, onOpenChange, mode, cutName }: Props) {
  const title = mode === "new" ? "Add cut" : "Edit cut";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 flex flex-col">
        <div className="flex justify-center pt-2 shrink-0">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetHeader className="px-4 pt-2 pb-3 border-b shrink-0 text-left">
          <SheetTitle>{title}</SheetTitle>
          {cutName && <p className="text-xs text-muted-foreground">{cutName}</p>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-muted-foreground">
          [Phase 1C: cut form — spec, qty, price, plant, brand, photos]
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CutSheetMobile;