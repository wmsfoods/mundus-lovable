import { useEffect, useRef, useState } from "react";
import { AnimateNumber } from "@/components/ui/animated-blur-number";
import { useVitrineStats } from "@/hooks/useVitrineStats";

export default function MundusVitrineStats() {
  const { tons, origins, destinations, loading } = useVitrineStats();

  return (
    <section
      aria-label="Mundus by the numbers"
      className="relative overflow-hidden border-y border-[#8B2E4F]/10"
      style={{
        background:
          "linear-gradient(135deg, #fff 0%, #fdf5f8 45%, #f7e6ec 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(139,46,79,0.18), transparent 70%)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(117,38,66,0.14), transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#752642] sm:text-[11px]">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B2E4F] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B2E4F]" />
          </span>
          <span>Mundus by the numbers · live</span>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
          <StatBlock
            label="Tons"
            sub="moved through the platform"
            value={loading ? 0 : tons}
            format={{ maximumFractionDigits: 0 }}
            suffix={<span className="ml-1 text-2xl font-semibold text-[#752642]/70 sm:text-3xl">t</span>}
          />
          <StatBlock
            label="Origins"
            sub="countries of origin"
            value={loading ? 0 : origins}
          />
          <StatBlock
            label="Destinations"
            sub="countries of destination"
            value={loading ? 0 : destinations}
          />
        </div>
      </div>
    </section>
  );
}

function StatBlock({
  label,
  sub,
  value,
  format,
  suffix,
}: {
  label: string;
  sub: string;
  value: number;
  format?: Intl.NumberFormatOptions;
  suffix?: React.ReactNode;
}) {
  const display = useCountUp(value, 1600);
  return (
    <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#752642] sm:text-[11px]">
        {label}
      </span>
      <div className="mt-1 flex items-baseline text-[#8B2E4F]">
        <AnimateNumber
          value={display}
          format={format}
          duration={650}
          blur={18}
          className="text-4xl font-extrabold leading-none tracking-tight sm:text-5xl md:text-6xl"
        />
        {suffix}
      </div>
      <span className="mt-2 text-xs text-[#752642]/70 sm:text-sm">{sub}</span>
    </div>
  );
}

function useCountUp(target: number, durationMs: number) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVal(target);
      return;
    }
    fromRef.current = val;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setVal(target >= 1 ? Math.round(next) : next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return val;
}