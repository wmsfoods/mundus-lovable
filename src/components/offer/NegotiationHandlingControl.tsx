import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export type NegotiationMode = "manual" | "auto";
export type NegotiationDial = "protect_margin" | "balanced" | "win_deal";

interface Props {
  mode: NegotiationMode;
  dial: NegotiationDial;
  onChange: (mode: NegotiationMode, dial: NegotiationDial) => void;
}

const DIAL_OPTIONS: { value: NegotiationDial; label: string; desc: string }[] = [
  { value: "protect_margin", label: "Protect margin", desc: "Hold firm. Concede slowly, prioritize price over closing." },
  { value: "balanced", label: "Balanced", desc: "Default. Reasonable concessions, fair pace toward a deal." },
  { value: "win_deal", label: "Win the deal", desc: "Aggressive. Move faster to floor to close the buyer." },
];

export default function NegotiationHandlingControl({ mode, dial, onChange }: Props) {
  const isAuto = mode === "auto";

  return (
    <div
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>
              Negotiation handling
            </span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="About negotiation handling"
                    style={{ display: "inline-flex", padding: 0, border: 0, background: "transparent", color: "hsl(var(--muted-foreground))", cursor: "help" }}
                  >
                    <Info size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" style={{ maxWidth: 280, lineHeight: 1.4 }}>
                  In Automatic mode, the system will respond to buyer bids on your behalf according to the selected strategy. You can still override and accept any bid at any time.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
            {isAuto ? "Mundus engine replies to buyers automatically." : "You reply to every buyer bid manually."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: !isAuto ? "#B64769" : "hsl(var(--muted-foreground))" }}>
            Manual
          </span>
          <Switch
            checked={isAuto}
            onCheckedChange={(v) => onChange(v ? "auto" : "manual", dial)}
            aria-label="Toggle automatic negotiation"
          />
          <span style={{ fontSize: 12, fontWeight: 500, color: isAuto ? "#B64769" : "hsl(var(--muted-foreground))" }}>
            Automatic
          </span>
        </div>
      </div>

      {isAuto && (
        <div
          role="radiogroup"
          aria-label="Automatic negotiation strategy"
          style={{ display: "grid", gap: 8 }}
        >
          {DIAL_OPTIONS.map((opt) => {
            const active = dial === opt.value;
            return (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  border: `1px solid ${active ? "#B64769" : "hsl(var(--border))"}`,
                  background: active ? "rgba(182, 71, 105, 0.06)" : "hsl(var(--card))",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "background 120ms, border-color 120ms",
                }}
              >
                <input
                  type="radio"
                  name="negotiation-dial"
                  value={opt.value}
                  checked={active}
                  onChange={() => onChange("auto", opt.value)}
                  style={{ marginTop: 3, accentColor: "#B64769" }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))" }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}