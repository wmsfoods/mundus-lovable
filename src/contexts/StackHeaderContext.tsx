import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type StackHeaderConfig = {
  /** Visible title in the header. Overrides the default route title. */
  title?: ReactNode;
  /** Optional right-aligned action nodes (icon buttons). Up to 2 recommended. */
  actions?: ReactNode;
};

type Ctx = {
  config: StackHeaderConfig;
  setConfig: (next: StackHeaderConfig) => void;
};

const StackHeaderCtx = createContext<Ctx | null>(null);

export function StackHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StackHeaderConfig>({});
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return <StackHeaderCtx.Provider value={value}>{children}</StackHeaderCtx.Provider>;
}

export function useStackHeaderConfig(): StackHeaderConfig {
  return useContext(StackHeaderCtx)?.config ?? {};
}

/**
 * Page-level hook to set the mobile StackHeader title and actions.
 * Safe to call from any descendant of the role shell. No-op on desktop.
 */
export function useStackHeader(config: StackHeaderConfig) {
  const ctx = useContext(StackHeaderCtx);
  useEffect(() => {
    if (!ctx) return;
    ctx.setConfig(config);
    return () => ctx.setConfig({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.title, config.actions]);
}