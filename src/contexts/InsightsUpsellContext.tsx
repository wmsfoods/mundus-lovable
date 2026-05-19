import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { InsightsUpsellPanel, type UpsellFeature } from "@/components/supplier/InsightsUpsellPanel";

type Ctx = {
  openUpsell: (feature: UpsellFeature) => void;
  closeUpsell: () => void;
};

const InsightsUpsellCtx = createContext<Ctx | null>(null);

export function InsightsUpsellProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<UpsellFeature>("price-benchmark");

  const openUpsell = useCallback((f: UpsellFeature) => {
    setFeature(f);
    setOpen(true);
  }, []);
  const closeUpsell = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openUpsell, closeUpsell }), [openUpsell, closeUpsell]);

  return (
    <InsightsUpsellCtx.Provider value={value}>
      {children}
      <InsightsUpsellPanel open={open} feature={feature} onClose={closeUpsell} />
    </InsightsUpsellCtx.Provider>
  );
}

export function useInsightsUpsell() {
  const ctx = useContext(InsightsUpsellCtx);
  if (!ctx) {
    // Safe no-op fallback so pages outside SupplierShell don't crash.
    return {
      openUpsell: () => {},
      closeUpsell: () => {},
    } satisfies Ctx;
  }
  return ctx;
}