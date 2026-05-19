import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "ghost" | "pill";
};

export function LanguageSwitcher({ className, variant = "ghost" }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm",
          variant === "pill"
            ? "h-9 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        <Globe className="h-4 w-4" />
        {current.short}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[140px] rounded-lg border border-gray-200 bg-white shadow-lg z-50 py-1">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                i18n.changeLanguage(l.code);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-gray-50",
                l.code === current.code && "bg-gray-50 font-medium",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}