import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  subtitle?: string;
};

/**
 * Phase 1A placeholder — full Markets/Freight/Container editor lands in Phase 1B.
 */
export function LogisticsSheetMobile({ open, onOpenChange, subtitle }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 flex flex-col">
        <div className="flex justify-center pt-2 shrink-0">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetHeader className="px-4 pt-2 pb-3 border-b shrink-0 text-left">
          <SheetTitle>Edit logistics</SheetTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-muted-foreground">
          [Phase 1B: Markets / Freight / Container tabs]
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default LogisticsSheetMobile;