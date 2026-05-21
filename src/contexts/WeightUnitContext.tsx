import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { WeightUnit } from "@/lib/units";

// TODO: When generating documents (Invoice, Packing List), use the BUYER's
// unit preference (from their profile), not the viewer's preference.
// For US/CA buyers, documents should default to lbs regardless of who views them.

const STORAGE_KEY = "mundus_weight_unit";

type Ctx = {
  unit: WeightUnit;
  setUnit: (u: WeightUnit) => void;
  toggle: () => void;
};

const WeightUnitContext = createContext<Ctx | null>(null);

export function WeightUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>(() => {
    if (typeof window === "undefined") return "kg";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "lbs" ? "lbs" : "kg";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, unit);
    } catch {
      /* ignore quota errors */
    }
  }, [unit]);

  const value = useMemo<Ctx>(
    () => ({
      unit,
      setUnit: setUnitState,
      toggle: () => setUnitState((u) => (u === "kg" ? "lbs" : "kg")),
    }),
    [unit],
  );

  return <WeightUnitContext.Provider value={value}>{children}</WeightUnitContext.Provider>;
}

export function useWeightUnit(): Ctx {
  const ctx = useContext(WeightUnitContext);
  if (!ctx) {
    // Safe fallback — pages used outside the provider still render in kg.
    return { unit: "kg", setUnit: () => {}, toggle: () => {} };
  }
  return ctx;
}