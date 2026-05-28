import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = "mundus-admin-theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
    }
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((p) => (p === "light" ? "dark" : "light")), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        padding: 0,
        background: theme === "dark"
          ? "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)"
          : "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
        transition: "background 0.4s ease",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {theme === "dark" && (
        <>
          <span style={{ position: "absolute", left: 6, top: 4, fontSize: 6, opacity: 0.6, color: "#fff" }}>✦</span>
          <span style={{ position: "absolute", left: 12, top: 12, fontSize: 4, opacity: 0.4, color: "#fff" }}>✦</span>
          <span style={{ position: "absolute", left: 8, top: 15, fontSize: 5, opacity: 0.5, color: "#fff" }}>✦</span>
        </>
      )}
      <div style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: theme === "dark" ? "#C7D2FE" : "#FFFBEB",
        boxShadow: theme === "dark"
          ? "inset -3px -2px 0 #818CF8"
          : "0 1px 3px rgba(0,0,0,0.2)",
        transform: theme === "dark" ? "translateX(22px)" : "translateX(3px)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease",
      }} />
    </button>
  );
}