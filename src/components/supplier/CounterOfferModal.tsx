import { useEffect, useMemo, useState } from "react";
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
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, priceLabel, weightLabel, toDisplay, fromDisplay } from "@/lib/units";

const MOCK_SUPPLIER_USER_ID = "0c543bae-647d-4f2e-980a-e35e70a94674";
const MOCK_BUYER_USER_ID = "c3000001-0000-0000-0000-000000000001";

export interface CounterOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiation: RealNegotiationRow;
  perspective?: "supplier" | "buyer";
  onSubmitted?: () => void;
}

export function CounterOfferModal({
  open,
  onOpenChange,
  negotiation,
  perspective = "supplier",
  onSubmitted,
}: CounterOfferModalProps) {
  const { t } = useTranslation();
  const { unit } = useWeightUnit();
  const pLbl = priceLabel(unit);
  const wLbl = weightLabel(unit);

  const items = negotiation.offer?.items ?? [];
  const rounds = negotiation.rounds ?? [];

  // Next raw round number; display round = ceil/2.
  const maxRaw = rounds.reduce((m, r) => Math.max(m, r.round), 0);
  const nextRaw = maxRaw + 1;
  const displayRound = Math.ceil(nextRaw / 2);

  // Latest "other side" prices per offer_item — what we're responding to.
  // Supplier responds to latest bid (odd round); buyer responds to latest counter (even round).
  const theirPrices = useMemo(() => {
    const wantOdd = perspective === "supplier";
    const filtered = rounds.filter((r) => (r.round % 2 === 1) === wantOdd);
    const last = filtered[filtered.length - 1];
    const map = new Map<string, number>();
    for (const c of last?.cut_rounds ?? []) map.set(c.offer_item_id, Number(c.price_per_kg));
    return map;
  }, [rounds, perspective]);

  // counters keyed by offer_item_id, stored as $/kg
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Prefill with asking price (supplier) or their latest counter (buyer).
    const initial: Record<string, number> = {};
    for (const it of items) {
      initial[it.id] =
        perspective === "supplier"
          ? Number(it.price)
          : theirPrices.get(it.id) ?? Number(it.price);
    }
    setCounters(initial);
    setMessage("");
  }, [open, items, perspective, theirPrices]);

  const askingTotal = items.reduce((s, it) => s + Number(it.price) * Number(it.amount), 0);
  const theirTotal = items.reduce(
    (s, it) => s + (theirPrices.get(it.id) ?? Number(it.price)) * Number(it.amount),
    0,
  );
  const counterTotal = items.reduce(
    (s, it) => s + (counters[it.id] ?? 0) * Number(it.amount),
    0,
  );

  const titleKey = perspective === "supplier" ? "supplier.counter.title" : "buyer.counter.title";
  const theirLabelKey = perspective === "supplier" ? "supplier.counter.theirBid" : "buyer.counter.theirCounter";
  const theirTotalKey = perspective === "supplier" ? "supplier.counter.theirBidTotal" : "buyer.counter.theirCounterTotal";

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const userId = perspective === "supplier" ? MOCK_SUPPLIER_USER_ID : MOCK_BUYER_USER_ID;
      const { data: rp, error: rpErr } = await supabase
        .from("round_proposals")
        .insert({
          negotiation_id: negotiation.id,
          round: nextRaw,
          created_by_user_id: userId,
        })
        .select("id")
        .single();
      if (rpErr || !rp) throw rpErr ?? new Error("round_proposals insert failed");

      const rows = items.map((it) => ({
        round_proposal_id: rp.id,
        offer_item_id: it.id,
        price_per_kg: counters[it.id] ?? Number(it.price),
        quantity_kg: Number(it.amount),
        total_value: (counters[it.id] ?? Number(it.price)) * Number(it.amount),
      }));
      const { error: crErr } = await supabase.from("cut_rounds").insert(rows);
      if (crErr) throw crErr;

      // Toggle status to the other party.
      const nextStatus = perspective === "supplier" ? "pending_buyer_review" : "awaiting_supplier";
      const { error: nErr } = await supabase
        .from("negotiations")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", negotiation.id);
      if (nErr) throw nErr;

      toast.success(t(`${perspective}.counter.successToast`));
      onOpenChange(false);
      onSubmitted?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit counter-offer";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(titleKey)} — {t("supplier.counter.roundOf", { round: displayRound, max: 3 })}
          </DialogTitle>
          <DialogDescription>{t(`${perspective}.counter.subtitle`)}</DialogDescription>
        </DialogHeader>

        {/* Timeline pills (compact) */}
        {rounds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {rounds.map((r, idx) => {
              const isBid = r.round % 2 === 1;
              const total = (r.cut_rounds ?? []).reduce(
                (s, c) => s + Number(c.price_per_kg) * Number(c.quantity_kg),
                0,
              );
              return (
                <span key={r.id} className="flex items-center gap-1">
                  {idx > 0 && <span className="text-muted-foreground">→</span>}
                  <span
                    className="px-2 py-1 rounded-md tabular-nums"
                    style={{
                      background: isBid ? "#dbeafe" : "#fce7f3",
                      color: isBid ? "#1e3a8a" : "#831843",
                    }}
                  >
                    {isBid ? "Bid" : "Counter"} R{Math.ceil(r.round / 2)} · US$ {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* Cuts table */}
        <div className="rounded-lg border border-border overflow-hidden mt-2">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("supplier.counter.col.product")}</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.qty", { unit: wLbl })}</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.asking")} ({pLbl})</th>
                <th className="px-3 py-2 font-medium text-right">{t(theirLabelKey)} ({pLbl})</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.yourCounter")} ({pLbl})</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.diff")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const asking = Number(it.price);
                const their = theirPrices.get(it.id) ?? asking;
                const yours = counters[it.id] ?? asking;
                const d = yours - their;
                const dPct = their > 0 ? (d / their) * 100 : 0;
                const displayCounter = toDisplay(yours, "price", unit);
                return (
                  <tr key={it.id} className="border-t border-border">
                    <td className="px-3 py-2">{it.customer_product?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtWeight(Number(it.amount), unit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPrice(asking, unit)}</td>
                    <td
                      className="px-3 py-2 text-right tabular-nums font-medium"
                      style={{ color: "#1e3a8a" }}
                    >
                      {fmtPrice(their, unit)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number.isFinite(displayCounter) ? displayCounter.toFixed(2) : ""}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          const kg = Number.isFinite(v) ? fromDisplay(v, "price", unit) : 0;
                          setCounters((prev) => ({ ...prev, [it.id]: kg }));
                        }}
                        className="h-9 w-24 ml-auto text-right tabular-nums focus-visible:ring-[#8B2252]"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      {Math.abs(d) > 0.001 ? (
                        <span style={{ color: d > 0 ? "#15803d" : "#b45309" }}>
                          {d > 0 ? "↑" : "↓"} ${Math.abs(d).toFixed(2)} ({d >= 0 ? "+" : ""}
                          {dPct.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
            <div className="text-xs text-muted-foreground">{t("supplier.counter.totalAsking")}</div>
            <div className="font-semibold tabular-nums">US$ {askingTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t(theirTotalKey)}</div>
            <div className="font-semibold tabular-nums" style={{ color: "#1e3a8a" }}>
              US$ {theirTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-md px-2 py-1" style={{ background: "rgba(139,34,82,0.08)" }}>
            <div className="text-xs text-muted-foreground">{t("supplier.counter.yourCounterTotal")}</div>
            <div className="font-semibold tabular-nums" style={{ color: "#8B2252" }}>
              US$ {counterTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mt-2">
          <label className="text-sm font-medium text-foreground">{t("supplier.counter.message")}</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("supplier.counter.messagePlaceholder")}
            className="mt-1 min-h-[72px]"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("supplier.counter.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: "#8B2252", color: "#fff" }}
            className="hover:opacity-90"
          >
            {submitting
              ? t("supplier.counter.submitting")
              : t("supplier.counter.submit", { round: displayRound })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CounterOfferModal;