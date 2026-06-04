import React, { useEffect, useRef, ReactNode } from "react";

/**
 * GlowCard — soft Mundus-tone spotlight wrapper.
 *
 * Pure visual wrapper: does NOT impose layout (no padding, no aspect-ratio,
 * no background, no shadow, no forced rounded). The child keeps all of its
 * existing styles; this component just adds a pointer-following spotlight
 * border-glow on top.
 */

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "mundus" | "mundus-soft" | "neutral";
  radius?: number; // border-radius in px (matches the child's radius)
}

const glowColorMap = {
  // base hue (HSL), spread (how much the hue shifts with mouse X)
  mundus: { base: 335, spread: 25, saturation: 55, lightness: 55 },
  "mundus-soft": { base: 345, spread: 15, saturation: 40, lightness: 70 },
  neutral: { base: 220, spread: 10, saturation: 8, lightness: 55 },
};

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
  glowColor = "mundus",
  radius = 14,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      if (cardRef.current) {
        cardRef.current.style.setProperty("--x", x.toFixed(2));
        cardRef.current.style.setProperty(
          "--xp",
          (x / window.innerWidth).toFixed(2),
        );
        cardRef.current.style.setProperty("--y", y.toFixed(2));
        cardRef.current.style.setProperty(
          "--yp",
          (y / window.innerHeight).toFixed(2),
        );
      }
    };
    document.addEventListener("pointermove", syncPointer);
    return () => document.removeEventListener("pointermove", syncPointer);
  }, []);

  const { base, spread, saturation, lightness } = glowColorMap[glowColor];

  const styleVars: React.CSSProperties = {
    // CSS custom props consumed by the pseudo-elements
    ["--base" as any]: base,
    ["--spread" as any]: spread,
    ["--saturation" as any]: saturation,
    ["--lightness" as any]: lightness,
    ["--radius" as any]: radius,
    ["--border" as any]: 1.5,
    ["--size" as any]: 180,
    ["--border-size" as any]: "calc(var(--border, 1.5) * 1px)",
    ["--spotlight-size" as any]: "calc(var(--size, 180) * 1px)",
    ["--hue" as any]:
      "calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",
    ["--border-spot-opacity" as any]: 0.35,
    ["--border-light-opacity" as any]: 0.18,
    position: "relative",
    display: "block",
    width: "100%",
    height: "100%",
    borderRadius: `${radius}px`,
    isolation: "isolate",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOW_CSS }} />
      <div
        ref={cardRef}
        data-mundus-glow
        style={styleVars}
        className={className}
      >
        {children}
      </div>
    </>
  );
};

const GLOW_CSS = `
  [data-mundus-glow] { pointer-events: auto; }
  [data-mundus-glow]::before,
  [data-mundus-glow]::after {
    pointer-events: none;
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: var(--border-size) solid transparent;
    background-attachment: fixed;
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: 50% 50%;
    -webkit-mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
            mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
    -webkit-mask-clip: padding-box, border-box;
            mask-clip: padding-box, border-box;
    -webkit-mask-composite: source-in, source-over;
            mask-composite: intersect;
    z-index: 2;
  }
  [data-mundus-glow]::before {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.9) calc(var(--spotlight-size) * 0.9) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(var(--hue, 335) calc(var(--saturation, 55) * 1%) calc(var(--lightness, 55) * 1%) / var(--border-spot-opacity, 0.35)),
      transparent 100%
    );
    filter: brightness(1.2);
  }
  [data-mundus-glow]::after {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(0 0% 100% / var(--border-light-opacity, 0.18)),
      transparent 100%
    );
  }
`;

export default GlowCard;