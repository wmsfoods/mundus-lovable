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
import {
  MAX_DISPLAY_ROUNDS,
  getAgreedItems,
  isCounterExhausted,
  isFinalDisplayRound,
  nextExpirationIso,
  getDeductionFeedback,
  type AgreedItem,
} from "@/lib/negotiationEngine";
import { Checkbox } from "@/components/ui/checkbox";

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

  const items = useMemo(() => negotiation.offer?.items ?? [], [negotiation.offer?.items]);
  const rounds = useMemo(() => negotiation.rounds ?? [], [negotiation.rounds]);

  // Already-agreed items (locked) — exclude from this round
  const existingAgreed: AgreedItem[] = useMemo(() => getAgreedItems(negotiation), [negotiation]);
  const agreedIds = useMemo(() => new Set(existingAgreed.map((a) => a.offer_item_id)), [existingAgreed]);
  const openItems = useMemo(() => items.filter((it) => !agreedIds.has(it.id)), [items, agreedIds]);

  // Next raw round number; display round = ceil/2.
  const maxRaw = rounds.reduce((m, r) => Math.max(m, r.round), 0);
  const nextRaw = maxRaw + 1;
  const displayRound = Math.ceil(nextRaw / 2);
  const isFinal = isFinalDisplayRound(displayRound);
  const exhausted = isCounterExhausted(negotiation); // nextRaw would exceed MAX_RAW_ROUNDS

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
  // Per-row "Accept this price" lock-in selection
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bulkMode, setBulkMode] = useState<"amount" | "percent">("amount");
  const [bulkValue, setBulkValue] = useState<string>("");

  const setAllCounters = (priceFor: (it: typeof openItems[number]) => number) => {
    setCounters((prev) => {
      const next = { ...prev };
      for (const it of openItems) {
        if (accepted[it.id]) continue;
        next[it.id] = +Math.max(0, priceFor(it)).toFixed(4);
      }
      return next;
    });
  };
  const acceptAllRows = () => {
    setAccepted(Object.fromEntries(openItems.map((it) => [it.id, true])));
  };
  const applyBulk = () => {
    const v = parseFloat(bulkValue);
    if (!Number.isFinite(v) || v <= 0) return;
    if (bulkMode === "percent") {
      const capped = perspective === "buyer" ? Math.min(v, 30) : v;
      const factor = perspective === "buyer" ? (1 - capped / 100) : (1 + capped / 100);
      setAllCounters((it) => (theirPrices.get(it.id) ?? Number(it.price)) * factor);
    } else {
      const deltaKg = fromDisplay(v, "price", unit);
      if (perspective === "buyer") {
        setAllCounters((it) => (theirPrices.get(it.id) ?? Number(it.price)) - deltaKg);
      } else {
        setAllCounters((it) => (theirPrices.get(it.id) ?? Number(it.price)) + deltaKg);
      }
    }
  };

  // Buyer's initial bid (round 1) per offer_item — used to floor buyer counter-bids.
  const buyerInitialBid = useMemo(() => {
    const map = new Map<string, number>();
    if (perspective !== "buyer") return map;
    const firstRound = rounds.find((r) => r.round === 1);
    for (const c of firstRound?.cut_rounds ?? []) {
      map.set(c.offer_item_id, Number(c.price_per_kg));
    }
    return map;
  }, [rounds, perspective]);

  useEffect(() => {
    if (!open) return;
    // Prefill with asking price (supplier) or their latest counter (buyer).
    const initial: Record<string, number> = {};
    for (const it of openItems) {
      initial[it.id] =
        perspective === "supplier"
          ? Number(it.price)
          : theirPrices.get(it.id) ?? Number(it.price);
    }
    setCounters(initial);
    setAccepted({});
    setMessage(
      (perspective === "buyer"
        ? negotiation.buyer_message
        : negotiation.supplier_message) ?? "",
    );
  }, [open, openItems, perspective, theirPrices, negotiation.buyer_message, negotiation.supplier_message]);

  const askingTotal = openItems.reduce((s, it) => s + Number(it.price) * Number(it.amount), 0);
  const theirTotal = openItems.reduce(
    (s, it) => s + (theirPrices.get(it.id) ?? Number(it.price)) * Number(it.amount),
    0,
  );
  const counterTotal = openItems.reduce(
    (s, it) => {
      const price = accepted[it.id]
        ? theirPrices.get(it.id) ?? Number(it.price)
        : counters[it.id] ?? 0;
      return s + price * Number(it.amount);
    },
    0,
  );

  const titleKey = perspective === "supplier" ? "supplier.counter.title" : "buyer.counter.title";
  const theirLabelKey = perspective === "supplier" ? "supplier.counter.theirBid" : "buyer.counter.theirCounter";
  const theirTotalKey = perspective === "supplier" ? "supplier.counter.theirBidTotal" : "buyer.counter.theirCounterTotal";

  // Per-row validation: directional + range checks.
  const errors = useMemo(() => {
    const out: Record<string, string> = {};

    if (perspective === "buyer") {
      // Floor: initial (round-1) bid
      for (const it of openItems) {
        if (accepted[it.id]) continue;
        const floor = buyerInitialBid.get(it.id);
        const v = counters[it.id];
        if (floor != null && v != null && v < floor - 1e-9) {
          out[it.id] = `Cannot bid below your initial bid ($${toDisplay(floor, "price", unit).toFixed(2)})`;
        }
      }
      // Must be ≥ previous buyer bid
      const buyerRounds = rounds.filter((r) => r.round % 2 === 1);
      const lastBuyerRound = buyerRounds[buyerRounds.length - 1];
      if (lastBuyerRound) {
        for (const it of openItems) {
          if (accepted[it.id] || out[it.id]) continue;
          const v = counters[it.id];
          const prevBid = lastBuyerRound.cut_rounds?.find((c) => c.offer_item_id === it.id);
          if (prevBid && v != null && v < Number(prevBid.price_per_kg) - 1e-9) {
            out[it.id] = `Bid must be ≥ your previous bid ($${toDisplay(Number(prevBid.price_per_kg), "price", unit).toFixed(2)})`;
          }
        }
      }
      // Max 30% deduction from asking
      for (const it of openItems) {
        if (accepted[it.id] || out[it.id]) continue;
        const v = counters[it.id];
        const asking = Number(it.price);
        if (v != null && asking > 0) {
          const deductPct = ((asking - v) / asking) * 100;
          if (deductPct > 30) {
            out[it.id] = `Maximum deduction is 30%. Current: ${deductPct.toFixed(1)}%`;
          }
        }
      }
    }

    if (perspective === "supplier") {
      const supplierRounds = rounds.filter((r) => r.round % 2 === 0);
      const lastSupplierRound = supplierRounds[supplierRounds.length - 1];
      for (const it of openItems) {
        if (accepted[it.id]) continue;
        const v = counters[it.id];
        if (v == null) continue;
        const asking = Number(it.price);
        const prevCounter = lastSupplierRound?.cut_rounds?.find((c) => c.offer_item_id === it.id);
        const ceiling = prevCounter ? Number(prevCounter.price_per_kg) : asking;
        if (v > ceiling + 1e-9) {
          out[it.id] = `Counter must be ≤ $${toDisplay(ceiling, "price", unit).toFixed(2)} (your ${prevCounter ? "previous counter" : "asking price"})`;
        }
      }
    }

    return out;
  }, [perspective, openItems, accepted, buyerInitialBid, counters, rounds, unit]);
  const errorCount = Object.keys(errors).length;

  const deductionFeedback = useMemo(() => {
    if (perspective !== "buyer" || bulkMode !== "percent") return null;
    const v = parseFloat(bulkValue);
    if (!Number.isFinite(v) || v <= 0) return null;
    return getDeductionFeedback(v);
  }, [perspective, bulkMode, bulkValue]);

  async function handleSubmit() {
    if (submitting || errorCount > 0) return;
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? (perspective === "buyer" ? MOCK_BUYER_USER_ID : null);
      if (authError || !userId) {
        throw new Error("Please sign in again before sending a counter-offer.");
      }

      // Newly-agreed items in this round (lock at the other side's price)
      const newlyAgreed: AgreedItem[] = openItems
        .filter((it) => accepted[it.id])
        .map((it) => ({
          offer_item_id: it.id,
          price_per_kg: theirPrices.get(it.id) ?? Number(it.price),
          agreed_at: new Date().toISOString(),
          agreed_round: displayRound,
        }));
      const remaining = openItems.filter((it) => !accepted[it.id]);
      const allLockedNow = remaining.length === 0;

      // Only insert a round if at least one item is still being negotiated
      if (!allLockedNow) {
        const { data: rp, error: rpErr } = await supabase
          .from("round_proposals")
          .insert({
            negotiation_id: negotiation.id,
            round: nextRaw,
            created_by_user_id: userId,
            side: perspective,
            type: perspective === "buyer" ? "bid" : "counter",
            message: message.trim() || null,
          })
          .select("id")
          .single();
        if (rpErr || !rp) throw rpErr ?? new Error("round_proposals insert failed");

        const rows = remaining.map((it) => ({
          round_proposal_id: rp.id,
          offer_item_id: it.id,
          price_per_kg: counters[it.id] ?? Number(it.price),
          quantity_kg: Number(it.amount),
        }));
        const { error: crErr } = await supabase.from("cut_rounds").insert(rows);
        if (crErr) throw crErr;
      }

      const mergedAgreed = [...existingAgreed, ...newlyAgreed];
      const update: Record<string, unknown> = {
        agreed_items: mergedAgreed,
        updated_at: new Date().toISOString(),
      };
      const trimmed = message.trim();
      if (perspective === "buyer") {
        update.buyer_message = trimmed ? trimmed : null;
      } else {
        update.supplier_message = trimmed ? trimmed : null;
      }
      if (allLockedNow) {
        // All items locked — deal closed
        const settled =
          mergedAgreed.reduce((s, a) => {
            const it = items.find((x) => x.id === a.offer_item_id);
            return s + a.price_per_kg * Number(it?.amount ?? 0);
          }, 0);
        update.status = "bid_accepted";
        update.settled_total_value = settled;
        update.expires_at = null;
      } else {
        update.status = perspective === "supplier" ? "pending_buyer_review" : "awaiting_supplier";
        update.expires_at = nextExpirationIso();
        update.current_round = displayRound;
        if (displayRound >= 3) update.chat_enabled = true;
      }
      const { error: nErr } = await supabase
        .from("negotiations")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(update as any)
        .eq("id", negotiation.id);
      if (nErr) throw nErr;

      toast.success(t(`${perspective}.counter.successToast`));

      // Fire email notification (best-effort, non-blocking)
      try {
        const offerTitle = items[0]?.customer_product?.name
          ? items.length > 1
            ? `Mix · ${items.length} items`
            : items[0].customer_product.name
          : "Offer";

        if (perspective === "buyer") {
          supabase.functions.invoke("negotiation-notifications", {
            body: {
              action: "new_bid",
              data: {
                supplier_email: "supplier@example.com",
                offer_title: offerTitle,
                buyer_name: "Buyer",
                round: displayRound,
                max_rounds: MAX_DISPLAY_ROUNDS,
                bid_total: counterTotal.toFixed(2),
                asking_total: askingTotal.toFixed(2),
                link: `${window.location.origin}/supplier/negotiations/${negotiation.id}`,
              },
            },
          }).catch(() => {});
        } else {
          supabase.functions.invoke("negotiation-notifications", {
            body: {
              action: "new_counter",
              data: {
                buyer_email: "buyer@example.com",
                offer_title: offerTitle,
                supplier_name: "Supplier",
                round: displayRound,
                max_rounds: MAX_DISPLAY_ROUNDS,
                counter_total: counterTotal.toFixed(2),
                link: `${window.location.origin}/buyer/negotiations/${negotiation.id}`,
              },
            },
          }).catch(() => {});
        }

        if (allLockedNow) {
          const settledValue = mergedAgreed.reduce((s, a) => {
            const it = items.find((x) => x.id === a.offer_item_id);
            return s + a.price_per_kg * Number(it?.amount ?? 0);
          }, 0);
          supabase.functions.invoke("negotiation-notifications", {
            body: {
              action: "bid_accepted",
              data: {
                to_email: perspective === "buyer" ? "supplier@example.com" : "buyer@example.com",
                offer_title: offerTitle,
                total_value: settledValue.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                link: `${window.location.origin}/supplier/negotiations/${negotiation.id}`,
              },
            },
          }).catch(() => {});
        }
      } catch (e) {
        console.warn("notification failed", e);
      }

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
      <DialogContent className="max-w-[760px] max-h-[90vh] overflow-y-auto sm:rounded-lg max-sm:!max-w-full max-sm:!max-h-[100dvh] max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:!m-0">
        <DialogHeader>
          <DialogTitle>
            {t(titleKey)} — {t("supplier.counter.roundOf", { round: displayRound, max: MAX_DISPLAY_ROUNDS })}
          </DialogTitle>
          <DialogDescription>{t(`${perspective}.counter.subtitle`)}</DialogDescription>
        </DialogHeader>

        {isFinal && !exhausted && (
          <div
            className="rounded-md px-3 py-2 text-xs font-medium border"
            style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }}
          >
            ⚠️ {t("engine.finalRound.banner",
              "Final Round — This is the last chance to reach agreement. Unresolved items will be cancelled after this round.")}
          </div>
        )}

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

        {/* Bulk apply — unified responsive */}
        {openItems.length > 0 && (
          <div className="mt-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground">
                {perspective === "buyer" ? "Apply bid in all items" : "Apply counter in all items"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setBulkMode("amount")}
                  className="px-3 py-1.5 font-medium"
                  style={bulkMode === "amount" ? { background: "#8B2252", color: "white" } : {}}
                >
                  $/{wLbl}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode("percent")}
                  className="px-3 py-1.5 font-medium"
                  style={bulkMode === "percent" ? { background: "#8B2252", color: "white" } : {}}
                >
                  %
                </button>
              </div>
              <Input
                type="number"
                step={bulkMode === "percent" ? "0.1" : "0.01"}
                min="0"
                max={bulkMode === "percent" ? "30" : undefined}
                inputMode="decimal"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder={bulkMode === "percent" ? "e.g. 3%" : `e.g. 0.10 $/${wLbl}`}
                className="h-9 w-32 text-right tabular-nums text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={applyBulk}
                style={{ color: "#8B2252" }}
              >
                Apply to All
              </Button>
              {deductionFeedback && (
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{ background: `${deductionFeedback.color}15`, color: deductionFeedback.color }}
                >
                  {deductionFeedback.level === "fair" && "✅ "}
                  {deductionFeedback.level === "high" && "⚠️ "}
                  {deductionFeedback.level === "aggressive" && "🔶 "}
                  {deductionFeedback.level === "extreme" && "🔴 "}
                  {deductionFeedback.message}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={acceptAllRows}
                className="h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
              >
                ✅ Accept all
              </button>
              <button
                type="button"
                onClick={() =>
                  setAllCounters((it) => ((theirPrices.get(it.id) ?? Number(it.price)) + Number(it.price)) / 2)
                }
                className="h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
              >
                Meet in middle
              </button>
            </div>
          </div>
        )}

        {/* Cuts — desktop table */}
        <div className="rounded-lg border border-border overflow-hidden mt-2 hidden sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium w-10"></th>
                <th className="px-3 py-2 font-medium">{t("supplier.counter.col.product")}</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.qty", { unit: wLbl })}</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.asking")} ({pLbl})</th>
                <th className="px-3 py-2 font-medium text-right">{t(theirLabelKey)} ({pLbl})</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.yourCounter")} ({pLbl})</th>
                <th className="px-3 py-2 font-medium text-right">{t("supplier.counter.col.diff")}</th>
              </tr>
            </thead>
            <tbody>
              {openItems.map((it) => {
                const asking = Number(it.price);
                const their = theirPrices.get(it.id) ?? asking;
                const isAccepted = !!accepted[it.id];
                const yours = isAccepted ? their : counters[it.id] ?? asking;
                const d = yours - their;
                const dPct = their > 0 ? (d / their) * 100 : 0;
                const displayCounter = toDisplay(yours, "price", unit);
                return (
                  <tr
                    key={it.id}
                    className="border-t border-border"
                    style={isAccepted ? { background: "rgba(21,128,61,0.06)" } : undefined}
                  >
                    <td className="px-3 py-2 align-middle">
                      <Checkbox
                        checked={isAccepted}
                        onCheckedChange={(c) =>
                          setAccepted((p) => ({ ...p, [it.id]: c === true }))
                        }
                        aria-label={t("engine.acceptThisPrice", "Accept this price")}
                      />
                    </td>
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
                        readOnly={isAccepted}
                        value={Number.isFinite(displayCounter) ? displayCounter.toFixed(2) : ""}
                        onChange={(e) => {
                          if (isAccepted) return;
                          const v = parseFloat(e.target.value);
                          const kg = Number.isFinite(v) ? fromDisplay(v, "price", unit) : 0;
                          setCounters((prev) => ({ ...prev, [it.id]: kg }));
                        }}
                        className={
                          "h-9 w-24 ml-auto text-right tabular-nums focus-visible:ring-[#8B2252]" +
                          (isAccepted ? " bg-green-50 text-green-800 border-green-300" : "") +
                          (errors[it.id] ? " border-destructive focus-visible:ring-destructive" : "")
                        }
                      />
                      {errors[it.id] && (
                        <div className="text-[11px] text-destructive mt-1 max-w-[200px] ml-auto">
                          {errors[it.id]}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      {isAccepted ? (
                        <span style={{ color: "#15803d" }}>🔒</span>
                      ) : Math.abs(d) > 0.001 ? (
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
              {openItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("engine.allLocked", "All items already agreed.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cuts — mobile cards */}
        <div className="flex flex-col gap-3 mt-2 sm:hidden">
          {openItems.length === 0 && (
            <div className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
              {t("engine.allLocked", "All items already agreed.")}
            </div>
          )}
          {openItems.map((it) => {
            const asking = Number(it.price);
            const their = theirPrices.get(it.id) ?? asking;
            const isAccepted = !!accepted[it.id];
            const yours = isAccepted ? their : counters[it.id] ?? asking;
            const d = yours - their;
            const dPct = their > 0 ? (d / their) * 100 : 0;
            const displayCounter = toDisplay(yours, "price", unit);
            return (
              <div
                key={it.id}
                className="rounded-lg border border-border p-3"
                style={isAccepted ? { background: "rgba(21,128,61,0.06)" } : undefined}
              >
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <Checkbox
                    checked={isAccepted}
                    onCheckedChange={(c) =>
                      setAccepted((p) => ({ ...p, [it.id]: c === true }))
                    }
                    aria-label={t("engine.acceptThisPrice", "Accept this price")}
                  />
                  <span className="font-medium text-sm flex-1">{it.customer_product?.name ?? "—"}</span>
                  {isAccepted && <span style={{ color: "#15803d" }}>🔒</span>}
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">{t("supplier.counter.col.qty", { unit: wLbl })}</div>
                    <div className="font-semibold tabular-nums">{fmtWeight(Number(it.amount), unit)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("supplier.counter.col.asking")} ({pLbl})</div>
                    <div className="font-semibold tabular-nums">{fmtPrice(asking, unit)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t(theirLabelKey)} ({pLbl})</div>
                    <div className="font-semibold tabular-nums" style={{ color: "#1e3a8a" }}>{fmtPrice(their, unit)}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("supplier.counter.col.yourCounter")} ({pLbl})
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    readOnly={isAccepted}
                    value={Number.isFinite(displayCounter) ? displayCounter.toFixed(2) : ""}
                    onChange={(e) => {
                      if (isAccepted) return;
                      const v = parseFloat(e.target.value);
                      const kg = Number.isFinite(v) ? fromDisplay(v, "price", unit) : 0;
                      setCounters((prev) => ({ ...prev, [it.id]: kg }));
                    }}
                    className={
                      "h-11 w-full text-right tabular-nums focus-visible:ring-[#8B2252]" +
                      (isAccepted ? " bg-green-50 text-green-800 border-green-300" : "") +
                      (errors[it.id] ? " border-destructive focus-visible:ring-destructive" : "")
                    }
                  />
                  {errors[it.id] && (
                    <div className="text-[11px] text-destructive mt-1">{errors[it.id]}</div>
                  )}
                  {!isAccepted && Math.abs(d) > 0.001 && (
                    <div className="text-[11px] tabular-nums mt-1" style={{ color: d > 0 ? "#15803d" : "#b45309" }}>
                      {d > 0 ? "↑" : "↓"} ${Math.abs(d).toFixed(2)} ({d >= 0 ? "+" : ""}{dPct.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="rounded-lg bg-muted/40 border border-border p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-3">
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

        <DialogFooter className="gap-2 sm:gap-2 max-sm:flex-col">
          {errorCount > 0 && (
            <div className="mr-auto text-xs text-destructive self-center">
              {t("buyer.bid.errors.summary", { count: errorCount, defaultValue: "{{count}} cut(s) have validation errors" })}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="max-sm:w-full max-sm:h-11">
            {t("supplier.counter.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || openItems.length === 0 || errorCount > 0}
            style={{ background: "#8B2252", color: "#fff" }}
            className="hover:opacity-90 max-sm:w-full max-sm:h-11"
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