import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/mundus/Modal";
import { supabase } from "@/integrations/supabase/client";
import type { Office } from "@/hooks/useCompanyOffices";
import { formatOfferNumber } from "@/lib/offerNumber";

type OfferRow = {
  id: string;
  offer_number: number | string | null;
  created_at?: string | null;
  status: string | null;
  origin_country: string | null;
  shipment_month: string | null;
  shipment_year: number | null;
  items?: { customer_product?: { name?: string | null } | null }[] | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  source: Office;
  targets: Office[];
  onTransferred?: () => void;
};

function offerLabel(o: OfferRow): string {
  const cuts = (o.items || [])
    .map((i) => i.customer_product?.name)
    .filter(Boolean) as string[];
  const cutText = cuts.length === 0 ? "Offer" : cuts.length === 1 ? cuts[0] : `Mixed (${cuts.length} cuts)`;
  const ship = [o.shipment_month, o.shipment_year].filter(Boolean).join(" ");
  const num =
    typeof o.offer_number === "number"
      ? formatOfferNumber(o.offer_number, o.created_at)
      : `M-${String(o.offer_number ?? "0").padStart(6, "0")}-${new Date(o.created_at ?? Date.now()).getFullYear()}`;
  return [`${num} ${cutText}`, ship].filter(Boolean).join(" — ");
}

export function TransferOffersModal({ open, onClose, source, targets, onTransferred }: Props) {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setTargetId("");
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("offers")
        .select(
          "id, offer_number, created_at, status, origin_country, shipment_month, shipment_year, shipment_ready_raw, items:offer_items(customer_product:customer_products(name))"
        )
        .eq("office_id", source.id)
        .is("deleted_at", null);
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setOffers((data as OfferRow[]) || []);
    })();
  }, [open, source.id]);

  if (!open) return null;

  const allSelected = offers.length > 0 && selected.size === offers.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(offers.map((o) => o.id)));

  const handleTransfer = async () => {
    if (!targetId) {
      toast.error("Choose a destination office");
      return;
    }
    if (selected.size === 0) {
      toast.error("Select at least one offer");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any)
      .from("offers")
      .update({ office_id: targetId })
      .in("id", Array.from(selected));
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Transferred ${selected.size} offer${selected.size === 1 ? "" : "s"}`);
    onTransferred?.();
    onClose();
  };

  const sourceLabel = source.office_name || source.name;

  return (
    <Modal open={open} onClose={onClose} width={560} ariaLabel="Transfer offers">
      <div className="modal-title" style={{ padding: "20px 24px 8px", fontWeight: 600, fontSize: 18 }}>
        📦 Transfer Offers
      </div>
      <div className="modal-body" style={{ padding: "8px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 14 }}>
          Move offers from: <strong>{sourceLabel}</strong>
        </div>
        <div className="field">
          <label className="field-label">Transfer to</label>
          <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select office…</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.office_name || t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Select offers to transfer</label>
          {loading ? (
            <div style={{ padding: 12, color: "var(--fg-muted)" }}>Loading…</div>
          ) : offers.length === 0 ? (
            <div style={{ padding: 12, color: "var(--fg-muted)" }}>No offers in this office.</div>
          ) : (
            <>
              <label style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                <span>Select all ({offers.length} offers)</span>
              </label>
              <div
                style={{
                  maxHeight: 240,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                {offers.map((o) => (
                  <label
                    key={o.id}
                    style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 4px", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                    />
                    <span style={{ fontSize: 13 }}>{offerLabel(o)}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {selected.size > 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--fg-muted)",
              background: "rgba(245, 158, 11, 0.1)",
              padding: 8,
              borderRadius: 6,
            }}
          >
            ⚠️ This will change the office assignment for {selected.size} selected offer
            {selected.size === 1 ? "" : "s"}.
          </div>
        )}
      </div>
      <div className="modal-footer" style={{ padding: "12px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" onClick={handleTransfer} disabled={busy || selected.size === 0 || !targetId}>
          {busy ? "Transferring…" : `Transfer ${selected.size} offer${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </Modal>
  );
}