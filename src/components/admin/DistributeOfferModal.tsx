import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/mundus/Modal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatOfferNumber } from "@/lib/offerNumber";

type Buyer = {
  id: string;
  name: string;
  country: string | null;
  email: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  offerId: string;
  offerNumber: number | null;
  offerCreatedAt?: string | null;
  offerTitle: string;
  supplierName: string;
};

export function DistributeOfferModal({ open, onClose, offerId, offerNumber, offerCreatedAt, offerTitle, supplierName }: Props) {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [country, setCountry] = useState<string>("");
  const [channel, setChannel] = useState<"email" | "notification" | "both">("both");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, country, company_users(email)")
        .eq("is_buyer", true)
        .order("name", { ascending: true });
      if (cancelled) return;
      const list: Buyer[] = (data ?? []).map((c: { id: string; name: string; country: string | null; company_users: { email: string | null }[] | null }) => ({
        id: c.id,
        name: c.name,
        country: c.country,
        email: c.company_users?.[0]?.email ?? null,
      }));
      setBuyers(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setCountry("");
      setChannel("both");
    }
  }, [open]);

  const countries = useMemo(() => {
    const s = new Set<string>();
    buyers.forEach(b => b.country && s.add(b.country));
    return Array.from(s).sort();
  }, [buyers]);

  const filtered = useMemo(() => {
    if (!country) return buyers;
    return buyers.filter(b => b.country === country);
  }, [buyers, country]);

  const allSelected = filtered.length > 0 && filtered.every(b => selected.has(b.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) filtered.forEach(b => next.delete(b.id));
    else filtered.forEach(b => next.add(b.id));
    setSelected(next);
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const send = async () => {
    if (selected.size === 0) return;
    setSending(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;
    const targets = buyers.filter(b => selected.has(b.id));
    const rows = targets.map(b => ({
      offer_id: offerId,
      target_company_id: b.id,
      target_email: b.email,
      target_country: b.country,
      sent_by_user_id: userId,
      channel,
      status: "sent" as const,
    }));
    const { error } = await supabase.from("offer_distributions").insert(rows);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Offer sent to ${targets.length} buyer${targets.length === 1 ? "" : "s"}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={620} ariaLabel="Distribute offer">
      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📧 Distribute Offer</h2>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              {offerTitle}{offerNumber != null ? ` · ${formatOfferNumber(offerNumber, offerCreatedAt)}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">×</button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Filter by country</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={selectStyle}>
              <option value="">All countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 280, overflow: "auto" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0 }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                Select all ({filtered.length} buyer{filtered.length === 1 ? "" : "s"})
              </span>
            </div>
            {loading ? (
              <div style={{ padding: 16, fontSize: 13, color: "#6b7280" }}>Loading buyers…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: "#6b7280" }}>No buyers found.</div>
            ) : filtered.map(b => (
              <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                <span style={{ flex: 1, fontWeight: 500 }}>{b.name}</span>
                <span style={{ color: "#6b7280", fontSize: 12, minWidth: 80 }}>{b.country ?? "—"}</span>
                <span style={{ color: "#6b7280", fontSize: 12, minWidth: 140, textAlign: "right" }}>{b.email ?? "—"}</span>
              </label>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Channel</div>
            <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
              {(["email", "notification", "both"] as const).map(c => (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" name="channel" checked={channel === c} onChange={() => setChannel(c)} />
                  <span style={{ textTransform: "capitalize" }}>{c === "both" ? "Email + Notification" : c}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#374151" }}>
            <div style={{ color: "#6b7280", marginBottom: 4 }}>Preview email subject:</div>
            <strong>New offer: {offerTitle} from {supplierName}</strong>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
          <button type="button" onClick={send} disabled={selected.size === 0 || sending} style={btnPrimary}>
            {sending ? "Sending…" : `Send to ${selected.size} buyer${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const selectStyle: React.CSSProperties = {
  border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, background: "white",
};
const btnGhost: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "white", fontSize: 13, cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, border: "1px solid #8B2252", background: "#8B2252", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
};