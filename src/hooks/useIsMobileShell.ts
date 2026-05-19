import * as React from "react";

const SHELL_BREAKPOINT = 1024;

/**
 * Returns true when viewport width is below the desktop shell breakpoint (1024px).
 * Drives the mobile-first shell: bottom nav + drawer + slim topbar.
 */
export function useIsMobileShell() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < SHELL_BREAKPOINT;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SHELL_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}