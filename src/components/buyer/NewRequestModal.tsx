import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSupplierOfferData } from "@/hooks/useSupplierOfferData";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { weightLabel, priceLabel } from "@/lib/units";

const CATEGORIES = ["Beef", "Pork", "Poultry", "Ovine"] as const;
const INCOTERMS = ["CFR", "CIF", "FOB"] as const;
const PAY_TERMS = [
  "30% Advance, Balance TT - Against finalized doc copies",
  "50% Advance, 50% Against BL copy",
  "100% TT in advance",
  "L/C at sight",
  "L/C 30 days",
  "10% Advance, Balance TT - Against finalized doc copies",
  "Open account 30 days",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const WINE = "#8B2252";

export default function NewRequestModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { markets, cutsByCategory, loading, error } = useSupplierOfferData();
  const { unit } = useWeightUnit();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Beef");
  const [selectedCuts, setSelectedCuts] = useState<Set<string>>(new Set());
  const [targetPrice, setTargetPrice] = useState("");
  const [targetVolume, setTargetVolume] = useState("");
  const [marketId, setMarketId] = useState("");
  const [portId, setPortId] = useState("");
  const [incoterm, setIncoterm] = useState<(typeof INCOTERMS)[number]>("CFR");
  const [shipmentMonth, setShipmentMonth] = useState("");
  const [payTerm, setPayTerm] = useState(PAY_TERMS[0]);
  const [notes, setNotes] = useState("");

  const tk = (k: string, fb: string) => t(`buyer.requests.newModal.${k}`, { defaultValue: fb });

  useEffect(() => {
    if (!open) {
      setTitle(""); setCategory("Beef"); setSelectedCuts(new Set());
      setTargetPrice(""); setTargetVolume(""); setMarketId(""); setPortId("");
      setIncoterm("CFR"); setShipmentMonth(""); setPayTerm(PAY_TERMS[0]); setNotes("");
    }
  }, [open]);

  useEffect(() => { setSelectedCuts(new Set()); }, [category]);
  useEffect(() => { setPortId(""); }, [marketId]);

  const cuts = cutsByCategory[category] ?? [];
  const market = useMemo(() => markets.find((m) => m.id === marketId), [markets, marketId]);
  const ports = market?.p ?? [];

  const toggleCut = (id: string) => {
    setSelectedCuts((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => {
    if (selectedCuts.size === cuts.length) setSelectedCuts(new Set());
    else setSelectedCuts(new Set(cuts.map((c) => c.id)));
  };

  const submit = () => {
    if (!title.trim()) return toast.error(tk("err.title", "Title is required"));
    if (selectedCuts.size === 0) return toast.error(tk("err.cuts", "Select at least one cut"));
    if (!targetPrice || Number(targetPrice) <= 0) return toast.error(tk("err.price", "Target price is required"));
    if (!targetVolume || Number(targetVolume) <= 0) return toast.error(tk("err.volume", "Target volume is required"));
    if (!marketId) return toast.error(tk("err.market", "Select a destination market"));
    if (!portId) return toast.error(tk("err.port", "Select a destination port"));
    if (!shipmentMonth) return toast.error(tk("err.shipment", "Select a shipment month"));
    toast.success(tk("toast.created", "Request created (mock)"));
    onOpenChange(false);
  };

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" };
  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 14, background: "#fff" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: WINE }}>
            {tk("title", "New offer request")}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div style={{ padding: 10, background: "#FEF2F2", color: "#991B1B", borderRadius: 6, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={lbl}>{tk("fields.title", "Title")} *</label>
            <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tk("placeholders.title", "e.g. Ribeye 7-9 lb for Q3")} />
          </div>

          <div>
            <label style={lbl}>{tk("fields.category", "Category")} *</label>
            <select style={inp} value={category} onChange={(e) => setCategory(e.target.value as any)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={lbl}>{tk("fields.cuts", "Cuts")} *</label>
              {cuts.length > 0 && (
                <button type="button" onClick={selectAll} style={{ fontSize: 12, color: WINE, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {selectedCuts.size === cuts.length ? tk("clearAll", "Clear all") : tk("selectAll", "Select all")}
                </button>
              )}
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #E5E7EB", borderRadius: 6, padding: 8, background: "#FAFAFA" }}>
              {loading ? <div style={{ fontSize: 13, color: "#6B7280" }}>{tk("loading", "Loading…")}</div> :
                cuts.length === 0 ? <div style={{ fontSize: 13, color: "#6B7280" }}>{tk("noCuts", "No cuts available")}</div> :
                cuts.map((c) => (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", fontSize: 13, cursor: "pointer", borderRadius: 4 }}>
                    <input type="checkbox" checked={selectedCuts.has(c.id)} onChange={() => toggleCut(c.id)} />
                    <span>{c.displayName}</span>
                  </label>
                ))
              }
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>{`${tk("fields.targetPriceShort", "Target price")} (USD${priceLabel(unit).replace("$", "")})`} *</label>
              <input style={inp} type="number" step="0.01" min="0" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>{`${tk("fields.targetVolumeShort", "Target volume")} (${weightLabel(unit)})`} *</label>
              <input style={inp} type="number" step="1" min="0" value={targetVolume} onChange={(e) => setTargetVolume(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>{tk("fields.market", "Destination market")} *</label>
            <select style={inp} value={marketId} onChange={(e) => setMarketId(e.target.value)}>
              <option value="">{tk("selectMarket", "Select a market…")}</option>
              {markets.map((m) => <option key={m.id} value={m.id}>{m.f} {m.n}</option>)}
            </select>
          </div>

          {market && ports.length === 0 && (
            <div style={{ padding: 10, background: "#FEF3C7", color: "#92400E", borderRadius: 6, fontSize: 13 }}>
              {tk("noPorts", "This market has no ports configured.")}
            </div>
          )}

          {market && ports.length > 0 && (
            <div>
              <label style={lbl}>{tk("fields.port", "Destination port")} *</label>
              <select style={inp} value={portId} onChange={(e) => setPortId(e.target.value)}>
                <option value="">{tk("selectPort", "Select a port…")}</option>
                {ports.map((p) => <option key={p.id} value={p.id}>{p.n}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>{tk("fields.incoterm", "Incoterm")} *</label>
              <select style={inp} value={incoterm} onChange={(e) => setIncoterm(e.target.value as any)}>
                {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>{tk("fields.shipment", "Shipment month")} *</label>
              <input style={inp} type="month" value={shipmentMonth} onChange={(e) => setShipmentMonth(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={lbl}>{tk("fields.payment", "Payment terms")}</label>
            <select style={inp} value={payTerm} onChange={(e) => setPayTerm(e.target.value)}>
              {PAY_TERMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>{tk("fields.notes", "Description / Notes")}</label>
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical", fontFamily: "inherit" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} style={{ padding: "8px 14px", border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {tk("cancel", "Cancel")}
          </button>
          <button type="button" onClick={submit} style={{ padding: "8px 14px", border: "none", borderRadius: 6, background: WINE, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {tk("submit", "Create request")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}