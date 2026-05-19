import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "color" | "white";
  className?: string;
}

export function Logo({ variant = "color", className }: LogoProps) {
  const iconBg = "#B64769";
  const mundusColor = variant === "white" ? "#ffffff" : "#B64769";
  const tradeColor = variant === "white" ? "rgba(255,255,255,0.85)" : "#666666";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ background: iconBg }}
      >
        <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
          <path
            d="M1 17V1L11 11L21 1V17"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="leading-none">
        <div
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 22, color: mundusColor, lineHeight: 1 }}
        >
          Mundus
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            fontSize: 10,
            color: tradeColor,
            letterSpacing: "0.15em",
            marginTop: 2,
          }}
        >
          TRADE
        </div>
      </div>
    </div>
  );
}