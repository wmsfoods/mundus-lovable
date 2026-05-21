import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { OfferDetailed } from "@/hooks/useOffer";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, priceLabel, weightLabel, toDisplay, fromDisplay } from "@/lib/units";

// Mock buyer identity until auth wiring is connected to the marketplace flow.
const MOCK_BUYER_COMPANY_ID = "00000000-0000-beef-0000-000000000001";
const MOCK_BUYER_USER_ID = "c3000001-0000-0000-0000-000000000001";

type FreightOption = {
  id: string;
  cost: number;
  port: { id: string; name: string; country: { english_name: string | null } | null } | null;
};

interface BidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: OfferDetailed;
}

export function BidModal({ open, onOpenChange, offer }: BidModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { unit } = useWeightUnit();
  const pLbl = priceLabel(unit);
  const wLbl = weightLabel(unit);

  const allowedIncoterms = useMemo(
    () => (offer.incoterms ?? []).map((i) => i.incoterm_type).filter(Boolean),
    [offer.incoterms],
  );

  const [incoterm, setIncoterm] = useState<string>(allowedIncoterms[0] ?? "CFR");
  const [freight, setFreight] = useState<FreightOption[]>([]);
  const [portId, setPortId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // bids stored as $/kg
  const [bids, setBids] = useState<Record<string, number>>(() =>
    Object.fromEntries(offer.items.map((it) => [it.id, Number(it.price)])),
  );

  useEffect(() => {
    if (!open) return;
    setBids(Object.fromEntries(offer.items.map((it) => [it.id, Number(it.price)])));
    setIncoterm(allowedIncoterms[0] ?? "CFR");
    setMessage("");
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("freight_options")
        .select("id, cost, port:ports(id, name, country:countries(english_name))")
        .eq("offer_id", offer.id);
      if (cancelled) return;
      const list = (data ?? []) as unknown as FreightOption[];
      setFreight(list);
      setPortId(list[0]?.port?.id ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [open, offer.id, offer.items, allowedIncoterms]);

  const selectedFreight = freight.find((f) => f.port?.id === portId);
  const totalKg = offer.items.reduce((s, it) => s + Number(it.amount), 0);
  const freightPerKg = selectedFreight && totalKg > 0 ? Number(selectedFreight.cost) / totalKg : 0;

  const askingTotal = offer.items.reduce((s, it) => s + Number(it.price) * Number(it.amount), 0);
  const bidTotal = offer.items.reduce((s, it) => s + (bids[it.id] ?? 0) * Number(it.amount), 0);
  const diff = bidTotal - askingTotal;
  const diffPct = askingTotal > 0 ? (diff / askingTotal) * 100 : 0;

  const hasAnyBid = offer.items.some((it) => (bids[it.id] ?? 0) > 0);

  async function handleSubmit() {
    if (!hasAnyBid || submitting) return;
    setSubmitting(true);
    try {
      const { data: neg, error: negErr } = await supabase
        .from("negotiations")
        .insert({
          offer_id: offer.id,
          buyer_company_id: MOCK_BUYER_COMPANY_ID,
          created_by_user_id: MOCK_BUYER_USER_ID,
          port_id: portId || null,
          freight_cost_per_kg: freightPerKg,
          fcl_count: offer.total_fcl ?? 1,
          incoterm,
          status: "awaiting_supplier",
          expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        })
        .select("id")
        .single();
      if (negErr || !neg) throw negErr ?? new Error("negotiation insert failed");

      const { data: rp, error: rpErr } = await supabase
        .from("round_proposals")
        .insert({
          negotiation_id: neg.id,
          round: 1,
          created_by_user_id: MOCK_BUYER_USER_ID,
        })
        .select("id")
        .single();
      if (rpErr || !rp) throw rpErr ?? new Error("round_proposals insert failed");

      const cutRows = offer.items.map((it) => ({
        round_proposal_id: rp.id,
        offer_item_id: it.id,
        price_per_kg: bids[it.id] ?? Number(it.price),
        quantity_kg: Number(it.amount),
        total_value: (bids[it.id] ?? Number(it.price)) * Number(it.amount),
      }));
      const { error: crErr } = await supabase.from("cut_rounds").insert(cutRows);
      if (crErr) throw crErr;

      // Generate a public response token so the supplier can reply via email link
      // without logging in. Failure here is non-fatal — log but don't break the bid.
      const { error: tokErr } = await supabase
        .from("negotiation_tokens")
        .insert({ negotiation_id: neg.id });
      if (tokErr) console.warn("token insert failed", tokErr.message);

      toast.success(t("buyer.bid.successToast"));
      onOpenChange(false);
      navigate("/buyer/negotiations");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("buyer.bid.title")}</DialogTitle>
          <DialogDescription>{t("buyer.bid.subtitle")}</DialogDescription>
        </DialogHeader>

        {/* Logistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("buyer.bid.incoterm")}</span>
            <select
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {allowedIncoterms.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("buyer.bid.destination")}</span>
            <select
              value={portId}
              onChange={(e) => setPortId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {freight.length === 0 && <option value="">—</option>}
              {freight.map((f) => (
                <option key={f.id} value={f.port?.id ?? ""}>
                  {f.port?.name} {f.port?.country?.english_name ? `(${f.port.country.english_name})` : ""}
                </option>
              ))}
            </select>
            {selectedFreight && (
              <span className="text-xs text-muted-foreground">
                {t("buyer.bid.freightCost")}: US$ {Number(selectedFreight.cost).toLocaleString()} ({pLbl}{" "}
                {fmtPrice(freightPerKg, unit)})
              </span>
            )}
          </label>
        </div>

        {/* Cuts table */}
        <div className="rounded-lg border border-border overflow-hidden mt-2">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("buyer.bid.cut")}</th>
                <th className="px-3 py-2 font-medium text-right">{t("buyer.bid.qty", { unit: wLbl })}</th>
                <th className="px-3 py-2 font-medium text-right">{t("buyer.bid.asking")} ({pLbl})</th>
                <th className="px-3 py-2 font-medium text-right">{t("buyer.bid.yourBid")} ({pLbl})</th>
              </tr>
            </thead>
            <tbody>
              {offer.items.map((it) => {
                const asking = Number(it.price);
                const bid = bids[it.id] ?? asking;
                const d = bid - asking;
                const dPct = asking > 0 ? (d / asking) * 100 : 0;
                const displayBid = toDisplay(bid, "price", unit);
                return (
                  <tr key={it.id} className="border-t border-border">
                    <td className="px-3 py-2">{it.customer_product?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtWeight(Number(it.amount), unit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPrice(asking, unit)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={Number.isFinite(displayBid) ? displayBid.toFixed(2) : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            const kg = Number.isFinite(v) ? fromDisplay(v, "price", unit) : 0;
                            setBids((prev) => ({ ...prev, [it.id]: kg }));
                          }}
                          className="h-9 w-24 text-right tabular-nums focus-visible:ring-[#8B2252]"
                        />
                        {Math.abs(d) > 0.001 && (
                          <span
                            className="text-[11px] tabular-nums"
                            style={{ color: d < 0 ? "#15803d" : "#b45309" }}
                          >
                            {d < 0 ? "↓" : "↑"} ${Math.abs(d).toFixed(2)} ({d < 0 ? "" : "+"}
                            {dPct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="rounded-lg bg-muted/40 border border-border p-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{t("buyer.bid.totalAsking")}</div>
            <div className="font-semibold tabular-nums">US$ {askingTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("buyer.bid.totalBid")}</div>
            <div className="font-semibold tabular-nums">US$ {bidTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("buyer.bid.difference")}</div>
            <div
              className="font-semibold tabular-nums"
              style={{ color: diff < 0 ? "#15803d" : diff > 0 ? "#b45309" : undefined }}
            >
              {diff === 0 ? "—" : `${diff < 0 ? "−" : "+"}US$ ${Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 2 })} (${diff < 0 ? "" : "+"}${diffPct.toFixed(1)}%)`}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mt-2">
          <label className="text-sm font-medium text-foreground">{t("buyer.bid.message")}</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("buyer.bid.messagePlaceholder")}
            className="mt-1 min-h-[72px]"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("buyer.bid.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasAnyBid || submitting}
            style={{ background: "#8B2252", color: "#fff" }}
            className="hover:opacity-90"
          >
            {submitting ? t("buyer.bid.submitting") : t("buyer.bid.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BidModal;