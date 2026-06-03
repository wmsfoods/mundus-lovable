import { useTranslation } from "react-i18next";

export type NegotiationMode = "manual" | "auto";
export type NegotiationDial = "protect_margin" | "balanced" | "win_deal";

type Props = {
  mode: NegotiationMode;
  dial: NegotiationDial;
  onChange: (next: { mode: NegotiationMode; dial: NegotiationDial }) => void;
  /** "section" = full block (use in offer creation), "compact" = inline (use on detail kill-switch) */
  variant?: "section" | "compact";
  disabled?: boolean;
};

const WINE = "#B64769";

const DIAL_OPTIONS: { value: NegotiationDial; titleKey: string; titleFb: string; descKey: string; descFb: string }[] = [
  {
    value: "protect_margin",
    titleKey: "negotiationHandling.dial.protect_margin.title",
    titleFb: "Protect margin",
    descKey: "negotiationHandling.dial.protect_margin.desc",
    descFb: "Fights hardest on price — may lose some deals.",
  },
  {
    value: "balanced",
    titleKey: "negotiationHandling.dial.balanced.title",
    titleFb: "Balanced",
    descKey: "negotiationHandling.dial.balanced.desc",
    descFb: "A mix of holding price and closing the deal.",
  },
  {
    value: "win_deal",
    titleKey: "negotiationHandling.dial.win_deal.title",
    titleFb: "Win the deal",
    descKey: "negotiationHandling.dial.win_deal.desc",
    descFb: "Prioritizes closing — concedes more on price.",
  },
];

export function dialLabel(dial: NegotiationDial, t: (k: string, fb?: string) => string): string {
  const o = DIAL_OPTIONS.find((d) => d.value === dial) ?? DIAL_OPTIONS[1];
  return t(o.titleKey, o.titleFb);
}

export function NegotiationHandlingControl({ mode, dial, onChange, variant = "section", disabled = false }: Props) {
  const { t } = useTranslation();
  const isAuto = mode === "auto";

  const setMode = (m: NegotiationMode) => onChange({ mode: m, dial });
  const setDial = (d: NegotiationDial) => onChange({ mode, dial: d });

  return (
    <div
      style={{
        border: variant === "section" ? "1px solid hsl(var(--border))" : "none",
        borderRadius: 10,
        padding: variant === "section" ? 12 : 0,
        background: variant === "section" ? "hsl(var(--muted))" : "transparent",
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {variant === "section" && (
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "hsl(var(--foreground))" }}>
          {t("negotiationHandling.title", "Negotiation handling")}
        </div>
      )}

      <div role="radiogroup" aria-label="Negotiation handling mode" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["manual", "auto"] as const).map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m)}
              style={{
                flex: variant === "section" ? "1 1 160px" : "0 0 auto",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1.5px solid ${on ? WINE : "hsl(var(--border))"}`,
                background: on ? WINE : "hsl(var(--background))",
                color: on ? "white" : "hsl(var(--foreground))",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{on ? "●" : "○"}</span>
                <span>
                  {m === "manual"
                    ? t("negotiationHandling.mode.manual", "Manual")
                    : t("negotiationHandling.mode.auto", "Automatic")}
                </span>
                {m === "manual" && (
                  <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 500 }}>
                    {t("negotiationHandling.default", "default")}
                  </span>
                )}
              </div>
              {variant === "section" && (
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, opacity: 0.85 }}>
                  {m === "manual"
                    ? t("negotiationHandling.mode.manualDesc", "You handle every counter-offer yourself.")
                    : t("negotiationHandling.mode.autoDesc", "We negotiate for you using the dial below (supervised).")}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {isAuto && (
        <div style={{ marginTop: variant === "section" ? 12 : 8 }}>
          {variant === "section" && (
            <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>
              {t("negotiationHandling.dialLabel", "Negotiation style")}
            </div>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            {DIAL_OPTIONS.map((opt) => {
              const on = dial === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDial(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${on ? WINE : "hsl(var(--border))"}`,
                    background: on ? "rgba(182,71,105,0.06)" : "hsl(var(--background))",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ color: on ? WINE : "hsl(var(--muted-foreground))", fontSize: 14, marginTop: 1 }}>
                    {on ? "●" : "○"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "hsl(var(--foreground))" }}>
                      {t(opt.titleKey, opt.titleFb)}
                    </div>
                    <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
                      {t(opt.descKey, opt.descFb)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}