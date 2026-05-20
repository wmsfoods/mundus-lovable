import { useState } from "react";
import { toast } from "sonner";

export function RevealButton({
  label, icon, value, onReveal,
}: { label: string; icon?: React.ReactNode; value: string | null; onReveal: () => Promise<string> | string }) {
  const [revealed, setRevealed] = useState<string | null>(value);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (revealed) return <span style={{ fontSize: 12 }}>{revealed}</span>;

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--adm-text-tertiary)" }}>1 credit?</span>
        <button className="psp-reveal" disabled={loading} onClick={async () => {
          setLoading(true);
          await new Promise((r) => setTimeout(r, 700));
          const v = await Promise.resolve(onReveal());
          setRevealed(v); setLoading(false); setConfirming(false);
          toast.success("Revealed");
        }}>{loading ? "..." : "Yes"}</button>
        <button className="psp-reveal" style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-tertiary)" }} onClick={() => setConfirming(false)}>No</button>
      </span>
    );
  }
  return (
    <button className="psp-reveal" onClick={() => setConfirming(true)}>
      {icon}<span>{label}</span>
    </button>
  );
}
