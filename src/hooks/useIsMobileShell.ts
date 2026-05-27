import * as React from "react";
import { Capacitor } from "@capacitor/core";

const SHELL_BREAKPOINT = 1024;

/**
 * Returns true when viewport width is below the desktop shell breakpoint (1024px),
 * or when running inside a Capacitor native shell (always mobile layout).
 */
export function useIsMobileShell() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (Capacitor.isNativePlatform()) return true;
    return window.innerWidth < SHELL_BREAKPOINT;
  });

  React.useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setIsMobile(true);
      return;
    }
    const mql = window.matchMedia(`(max-width: ${SHELL_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
