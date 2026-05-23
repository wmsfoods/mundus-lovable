import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PROTEINS = ["Beef", "Pork", "Poultry", "Ovine", "Goat", "Game"];

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3,
};

export default function BuyerProfileSection({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const [loading, setLoading] = useState(true);
  const [proteins, setProteins] = useState<string[]>([]);
  const [cuts, setCuts] = useState<string[]>([]);
  const [cutDraft, setCutDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("buyer_protein_profile,preferred_cuts")
        .eq("id", companyId)
        .maybeSingle();
      if (cancelled) return;
      const d = data as any;
      setProteins((d?.buyer_protein_profile as string[]) ?? []);
      setCuts((d?.preferred_cuts as string[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const save = async (patch: { buyer_protein_profile?: string[]; preferred_cuts?: string[] }) => {
    const { error } = await supabase.from("companies").update(patch as any).eq("id", companyId);
    if (error) toast.error(error.message);
  };

  if (loading) return <section className="cp-card" style={{ padding: 16 }}>Loading buyer profile…</section>;

  return (
    <section className="cp-card">
      <header className="cp-section-head">
        <h2>🛒 Buyer Profile</h2>
      </header>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: -4, marginBottom: 14 }}>
        What protein(s) do you buy?
      </p>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Buyer protein profile</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PROTEINS.map((p) => {
            const on = proteins.includes(p);
            return (
              <button
                key={p}
                type="button"
                disabled={!canEdit}
                className={`cp-chip-btn ${on ? "is-on" : ""}`}
                onClick={() => {
                  const next = on ? proteins.filter((x) => x !== p) : [...proteins, p];
                  setProteins(next);
                  save({ buyer_protein_profile: next });
                }}
              >
                {on ? "✓ " : ""}{p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Preferred Cuts (optional)</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {cuts.map((c) => (
            <span key={c} className="cp-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {c}
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Remove ${c}`}
                  onClick={() => { const next = cuts.filter((x) => x !== c); setCuts(next); save({ preferred_cuts: next }); }}
                  style={{ border: 0, background: "transparent", cursor: "pointer", color: "#8B2252", padding: 0 }}
                >×</button>
              )}
            </span>
          ))}
          {canEdit && (
            <input
              className="cp-inline"
              placeholder="+ Add cut (press Enter)"
              value={cutDraft}
              onChange={(e) => setCutDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cutDraft.trim()) {
                  e.preventDefault();
                  const v = cutDraft.trim();
                  if (!cuts.includes(v)) {
                    const next = [...cuts, v];
                    setCuts(next);
                    save({ preferred_cuts: next });
                  }
                  setCutDraft("");
                }
              }}
              style={{ minWidth: 180 }}
            />
          )}
        </div>
      </div>
    </section>
  );
}