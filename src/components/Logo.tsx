import { cn } from "@/lib/utils";
import mundusLogo from "@/assets/mundus-logo.png";

interface LogoProps {
  /** size in pixels (height) — width auto. Defaults to 36. */
  size?: number | "sm" | "md" | "lg";
  className?: string;
  /** kept for backward compatibility; the PNG is fixed-color so this is ignored. */
  variant?: "color" | "white";
}

const SIZE_MAP: Record<"sm" | "md" | "lg", number> = { sm: 24, md: 36, lg: 48 };

export function Logo({ size = "md", className }: LogoProps) {
  const px = typeof size === "number" ? size : SIZE_MAP[size];
  return (
    <img
      src={mundusLogo}
      alt="Mundus Trade"
      className={cn("w-auto select-none", className)}
      style={{ height: px }}
      draggable={false}
    />
  );
}