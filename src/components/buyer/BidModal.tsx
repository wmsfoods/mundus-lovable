import { useEffect, useMemo, useRef, useState } from "react";
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
import { isUuid } from "@/hooks/useRealNegotiation";
import { getDeductionFeedback } from "@/lib/negotiationEngine";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useAuth } from "@/contexts/AuthContext";
import {
  getEffectiveAskingPrice,
  getIncotermBannerLabel,
  getIncotermAddOn,
} from "@/lib/incotermPricing";
import { useRemainingFcl } from "@/hooks/useRemainingFcl";
import { notifyCompanyUsers } from "@/lib/notifications";

const MIN_BID_PCT = 0.9; // initial bid must be ≥ 90% of asking

type FreightOption = {
  id: string;
  cost: number;
  insurance?: number | null;
  port: { id: string; name: string; country: { english_name: string | null } | null } | null;
};

interface BidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: OfferDetailed;
}

type DraftShape = {
  incoterm?: string;
  portId?: string;
  message?: string;
  bids?: Record<string, number>;
  fclCount?: number;
};

function draftKey(offerId: string) {
  return `bid-draft-${offerId}`;
}
function loadDraft(offerId: string): DraftShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(draftKey(offerId));
    return raw ? (JSON.parse(raw) as DraftShape) : null;
  } catch { return null; }
}
function saveDraft(offerId: string, d: DraftShape) {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(draftKey(offerId), JSON.stringify(d)); } catch { /* ignore */ }
}
function clearDraft(offerId: string) {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(draftKey(offerId)); } catch { /* ignore */ }
}

export function BidModal({ open, onOpenChange, offer }: BidModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { unit } = useWeightUnit();
  const { company } = useCurrentCompany();
  const { user: authUser } = useAuth();
  const pLbl = priceLabel(unit);
  const wLbl = weightLabel(unit);
  const isRealOffer = isUuid(offer.id);

  const allowedIncoterms = useMemo(
    () => (offer.incoterms ?? []).map((i) => i.incoterm_type).filter(Boolean),
    [offer.incoterms],
  );

  const [incoterm, setIncoterm] = useState<string>(allowedIncoterms[0] ?? "CFR");
  const [freight, setFreight] = useState<FreightOption[]>([]);
  const [portId, setPortId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fclCount, setFclCount] = useState<number>(1);
  // bids stored as $/kg
  // null = empty input (user cleared it). Numbers stored as $/kg.
  const [bids, setBids] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(offer.items.map((it) => [it.id, Number(it.price)])),
  );
  // Per-item editable text buffer for the bid input. Stays decoupled from
  // the numeric `bids` state so typing doesn't fight reformatting.
  const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({});
  const hydratedRef = useRef(false);
  const [bulkMode, setBulkMode] = useState<"amount" | "percent">("amount");
  const [bulkValue, setBulkValue] = useState<string>("");

  const applyAllBids = (priceFor: (askingKg: number) => number) => {
    const next: Record<string, number> = Object.fromEntries(
      offer.items.map((it) => [it.id, +priceFor(Number(it.price)).toFixed(4)]),
    );
    setBids(next);
    // Re-sync the text buffers so the inputs reflect the new values.
    setBidDrafts(
      Object.fromEntries(
        Object.entries(next).map(([id, kg]) => [
          id,
          toDisplay(kg, "price", unit).toFixed(2),
        ]),
      ),
    );
  };
  const applyBulk = () => {
    const v = parseFloat(bulkValue);
    if (!Number.isFinite(v) || v <= 0) return;
    if (bulkMode === "percent") {
      const capped = Math.min(v, 30); // max 30% deduction
      const factor = 1 - capped / 100;
      applyAllBids((asking) => asking * factor);
    } else {
      const deltaKg = fromDisplay(v, "price", unit);
      applyAllBids((asking) => Math.max(0, asking - deltaKg)); // buyer deducts
    }
  };

  const deductionFeedback = useMemo(() => {
    if (bulkMode !== "percent") return null;
    const v = parseFloat(bulkValue);
    if (!Number.isFinite(v) || v <= 0) return null;
    return getDeductionFeedback(v);
  }, [bulkMode, bulkValue]);

  useEffect(() => {
    if (!open) return;
    const draft = loadDraft(offer.id);
    const initial: Record<string, number> = Object.fromEntries(
      offer.items.map((it) => [it.id, draft?.bids?.[it.id] ?? Number(it.price)]),
    );
    setBids(initial);
    setBidDrafts(
      Object.fromEntries(
        Object.entries(initial).map(([id, kg]) => [
          id,
          toDisplay(kg, "price", unit).toFixed(2),
        ]),
      ),
    );
    setIncoterm(draft?.incoterm ?? allowedIncoterms[0] ?? "CFR");
    setMessage(draft?.message ?? "");
    setFclCount(draft?.fclCount ?? 1);
    hydratedRef.current = true;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("freight_options")
        .select("id, cost, insurance, port:ports(id, name, country:countries(english_name))")
        .eq("offer_id", offer.id);
      if (cancelled) return;
      const list = (data ?? []) as unknown as FreightOption[];
      setFreight(list);
      const draftedPort = draft?.portId;
      const hasDrafted = draftedPort && list.some((f) => f.port?.id === draftedPort);
      setPortId(hasDrafted ? draftedPort! : (list[0]?.port?.id ?? ""));
    })();
    return () => {
      cancelled = true;
      hydratedRef.current = false;
    };
  }, [open, offer.id, offer.items, allowedIncoterms]);

  // Persist draft on every change while modal is open.
  useEffect(() => {
    if (!open || !hydratedRef.current) return;
    const cleanBids: Record<string, number> = {};
    for (const [k, v] of Object.entries(bids)) {
      if (typeof v === "number" && Number.isFinite(v)) cleanBids[k] = v;
    }
    saveDraft(offer.id, { incoterm, portId, message, bids: cleanBids, fclCount });
  }, [open, offer.id, incoterm, portId, message, bids, fclCount]);

  const selectedFreight = freight.find((f) => f.port?.id === portId);
  const totalKg = offer.items.reduce((s, it) => s + Number(it.amount), 0);
  const freightPerKg = selectedFreight && totalKg > 0 ? Number(selectedFreight.cost) / totalKg : 0;
  const insurancePerKg =
    selectedFreight && selectedFreight.insurance && totalKg > 0
      ? Number(selectedFreight.insurance) / totalKg
      : 0;

  // FCL allocation (Feature 2)
  const fclAlloc = useRemainingFcl(isRealOffer ? offer.id : null, offer.total_fcl ?? 1);
  const totalOfferFcl = Math.max(1, offer.total_fcl ?? 1);
  // For real offers honor what's still available; for mocks fall back to total.
  const remainingFcl = isRealOffer ? Math.max(1, fclAlloc.available) : totalOfferFcl;
  // Clamp draft / out-of-range values once the allocation is known.
  useEffect(() => {
    if (fclCount > remainingFcl) setFclCount(remainingFcl);
    if (fclCount < 1) setFclCount(1);
  }, [remainingFcl, fclCount]);

  // Effective (incoterm-adjusted) asking price per item.
  const effectiveAsking = (basePrice: number) =>
    getEffectiveAskingPrice(basePrice, incoterm, freightPerKg, insurancePerKg);

  // Sync bids with effective asking whenever incoterm or freight inputs change.
  // This runs after hydration so the initial draft load wins on first open,
  // and re-syncs whenever the buyer flips incoterm or freight stabilizes.
  useEffect(() => {
    if (!open || !hydratedRef.current) return;
    const next: Record<string, number> = Object.fromEntries(
      offer.items.map((it) => [
        it.id,
        getEffectiveAskingPrice(Number(it.price), incoterm, freightPerKg, insurancePerKg),
      ]),
    );
    setBids(next);
    setBidDrafts(
      Object.fromEntries(
        Object.entries(next).map(([id, kg]) => [
          id,
          toDisplay(kg, "price", unit).toFixed(2),
        ]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoterm, freightPerKg, insurancePerKg, open]);
  const incoBanner = getIncotermBannerLabel(
    incoterm,
    freightPerKg,
    insurancePerKg,
    (v) => `${fmtPrice(v, unit)} ${pLbl}`,
  );

  const askingTotal =
    offer.items.reduce(
      (s, it) => s + effectiveAsking(Number(it.price)) * Number(it.amount),
      0,
    ) * fclCount;
  const bidTotal =
    offer.items.reduce(
      (s, it) =>
        s +
        (typeof bids[it.id] === "number" ? (bids[it.id] as number) : 0) *
          Number(it.amount),
      0,
    ) * fclCount;
  const diff = bidTotal - askingTotal;
  const diffPct = askingTotal > 0 ? (diff / askingTotal) * 100 : 0;

  // ── Validation (only enforced for real offers) ──────────────────────────
  const errors = useMemo(() => {
    if (!isRealOffer) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const it of offer.items) {
      const asking = effectiveAsking(Number(it.price));
      const min = asking * MIN_BID_PCT;
      const v = bids[it.id];
      if (v == null || !Number.isFinite(v) || v <= 0) {
        out[it.id] = t("buyer.bid.validation.required", "Enter a bid greater than 0");
      } else if (v < min) {
        out[it.id] = t("buyer.bid.validation.minPct", {
          defaultValue: "Minimum bid is ${{min}} (90% of asking)",
          min: toDisplay(min, "price", unit).toFixed(2),
        });
      }
      // Max 30% deduction from asking
      if (v != null && Number.isFinite(v) && v > 0 && asking > 0) {
        const deductPct = ((asking - v) / asking) * 100;
        if (deductPct > 30) {
          out[it.id] = `Maximum deduction is 30%. Current: ${deductPct.toFixed(1)}%`;
        }
      }
    }
    return out;
  }, [isRealOffer, offer.items, bids, t, unit, incoterm, freightPerKg, insurancePerKg]);
  const errorCount = Object.keys(errors).length;

  const allFilled = offer.items.every((it) => {
    const v = bids[it.id];
    return typeof v === "number" && Number.isFinite(v) && v > 0;
  });
  const canSubmit =
    allFilled && (!isRealOffer || (errorCount === 0 && remainingFcl > 0));

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    const buyerCompanyId = company?.id;
    const buyerUserId = authUser?.id;
    if (!buyerCompanyId || !buyerUserId) {
      toast.error("Please sign in to submit a bid.");
      return;
    }
    setSubmitting(true);
    try {
      // Check if buyer already has an active negotiation for this offer
      const { data: existing } = await supabase
        .from("negotiations")
        .select("id, status")
        .eq("offer_id", offer.id)
        .eq("buyer_company_id", buyerCompanyId)
        .in("status", ["awaiting_supplier", "pending_buyer_review"])
        .maybeSingle();
      if (existing?.id) {
        toast.info(t("buyer.bid.alreadyActive", "You already have an active negotiation for this offer."));
        clearDraft(offer.id);
        onOpenChange(false);
        navigate(`/buyer/negotiations/${existing.id}`);
        return;
      }

      const { data: neg, error: negErr } = await supabase
        .from("negotiations")
        .insert({
          offer_id: offer.id,
          buyer_company_id: buyerCompanyId,
          created_by_user_id: buyerUserId,
          port_id: portId || null,
          freight_cost_per_kg: freightPerKg,
          insurance_per_kg: insurancePerKg,
          fcl_count: fclCount,
          incoterm,
          status: "awaiting_supplier",
          expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
          buyer_message: message.trim() ? message.trim() : null,
        })
        .select("id")
        .single();
      if (negErr || !neg) throw negErr ?? new Error("negotiation insert failed");

      const { data: rp, error: rpErr } = await supabase
        .from("round_proposals")
        .insert({
          negotiation_id: neg.id,
          round: 1,
          created_by_user_id: buyerUserId,
          side: "buyer",
          type: "bid",
          message: message.trim() || null,
          incoterm,
          freight_per_kg: freightPerKg,
          insurance_per_kg: insurancePerKg,
        })
        .select("id")
        .single();
      if (rpErr || !rp) throw rpErr ?? new Error("round_proposals insert failed");

      // Persist the FOB-equivalent price so it can be compared against the
      // supplier's asking directly. The buyer's bid was entered against the
      // *effective* (incoterm-adjusted) price, so strip the add-on back off.
      const addOn = getIncotermAddOn(incoterm, freightPerKg, insurancePerKg);
      const cutRows = offer.items.map((it) => {
        const enteredEffective =
          typeof bids[it.id] === "number"
            ? (bids[it.id] as number)
            : effectiveAsking(Number(it.price));
        const fobBid = Math.max(0, enteredEffective - addOn);
        return {
          round_proposal_id: rp.id,
          offer_item_id: it.id,
          price_per_kg: fobBid,
          quantity_kg: Number(it.amount),
        };
      });
      const { error: crErr } = await supabase.from("cut_rounds").insert(cutRows);
      if (crErr) throw crErr;

      // Generate a public response token so the supplier can reply via email link
      // without logging in. Failure here is non-fatal — log but don't break the bid.
      const { error: tokErr } = await supabase
        .from("negotiation_tokens")
        .insert({ negotiation_id: neg.id });
      if (tokErr) console.warn("token insert failed", tokErr.message);

      toast.success(t("buyer.bid.successToast"));
      clearDraft(offer.id);

      // Fire in-app notification to supplier company (best-effort)
      notifyCompanyUsers({
        companyId: offer.supplier_id,
        title: "New bid received",
        body: `${company?.name ?? "A buyer"} placed a bid on offer #${offer.offer_number}`,
        icon: "dollar",
        category: "negotiations",
        linkUrl: `/supplier/negotiations/${neg.id}`,
        relatedType: "negotiation",
        relatedId: neg.id,
      }).catch(() => {});

      onOpenChange(false);
      navigate("/buyer/negotiations");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("negotiations_unique_active_per_buyer_offer")) {
        toast.error(t("buyer.bid.alreadyActive", "You already have an active negotiation for this offer."));
      } else {
        toast.error(msg || "Failed to submit bid");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90vh] overflow-y-auto sm:rounded-lg max-sm:!max-w-full max-sm:!max-h-[100dvh] max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:!m-0">
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
                {t("buyer.bid.freightCost")}: US$ {Number(selectedFreight.cost).toLocaleString()} (
                {fmtPrice(freightPerKg, unit)} {pLbl})
                {insurancePerKg > 0 && (
                  <> · Insurance {fmtPrice(insurancePerKg, unit)} {pLbl}</>
                )}
              </span>
            )}
          </label>
        </div>

        {/* Incoterm banner — explains what's included in the displayed prices */}
        <div
          className="rounded-md border px-3 py-2 mt-2 text-xs"
          style={
            incoBanner.tone === "warn"
              ? { background: "#fef3c7", borderColor: "#fcd34d", color: "#92400e" }
              : { background: "#ecfeff", borderColor: "#a5f3fc", color: "#155e75" }
          }
        >
          {incoBanner.tone === "warn" ? "⚠️ " : "ℹ️ "}
          {incoBanner.text}
        </div>

        {/* FCL allocation (Feature 2) */}
        {totalOfferFcl > 1 && (
          <div className="mt-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-semibold text-muted-foreground">
                  Number of FCLs
                </label>
                <select
                  value={fclCount}
                  onChange={(e) => setFclCount(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm tabular-nums"
                  disabled={remainingFcl === 0}
                >
                  {Array.from({ length: Math.max(1, remainingFcl) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} FCL{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-muted-foreground flex-1">
                <span className="font-medium text-foreground">
                  {remainingFcl}
                </span>{" "}
                of {totalOfferFcl} available
                {fclAlloc.sold > 0 && <> · {fclAlloc.sold} sold</>}
                {fclAlloc.inNegotiation > 0 && <> · {fclAlloc.inNegotiation} in negotiation</>}
              </div>
            </div>
            {remainingFcl === 0 && (
              <div className="text-xs text-destructive mt-2">
                No FCLs available — this offer is fully claimed.
              </div>
            )}
          </div>
        )}

        {/* Bulk apply — unified responsive */}
        <div className="mt-3 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase font-semibold text-muted-foreground">
              Apply bid in all items
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode toggle */}
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

            {/* Value input */}
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

            {/* Deduction feedback */}
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

          {/* Quick shortcuts */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => applyAllBids((a) => a)}
              className="h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
            >
              Accept asking
            </button>
            <button
              type="button"
              onClick={() => applyAllBids((a) => a * 0.97)}
              className="h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
            >
              Asking -3%
            </button>
          </div>
        </div>

        {/* Cuts — desktop table */}
        <div className="rounded-lg border border-border overflow-hidden mt-2 hidden sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">Product / Cut</th>
                <th className="px-3 py-2 font-medium text-right">{t("buyer.bid.qty", { unit: wLbl })}</th>
                <th className="px-3 py-2 font-medium text-right">Asking ({pLbl}) · {incoterm}</th>
                <th className="px-3 py-2 font-medium text-right">{t("buyer.bid.yourBid")} ({pLbl})</th>
              </tr>
            </thead>
            <tbody>
              {offer.items.map((it) => {
                const fob = Number(it.price);
                const asking = effectiveAsking(fob);
                const bidVal = bids[it.id];
                const bid = typeof bidVal === "number" ? bidVal : asking;
                const d = bid - asking;
                const dPct = asking > 0 ? (d / asking) * 100 : 0;
                const isEmpty = bidVal === null || bidVal === undefined;
                const displayBid = toDisplay(bid, "price", unit);
                const displayDiff = toDisplay(d, "price", unit);
                const err = errors[it.id];
                const showErr = !!err;
                return (
                  <tr key={it.id} className="border-t border-border">
                    <td className="px-3 py-2">{it.customer_product?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtWeight(Number(it.amount), unit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {fmtPrice(asking, unit)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={isEmpty ? "" : (Number.isFinite(displayBid) ? displayBid.toFixed(2) : "")}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setBids((prev) => ({ ...prev, [it.id]: null }));
                              return;
                            }
                            const v = parseFloat(raw);
                            if (!Number.isFinite(v)) {
                              setBids((prev) => ({ ...prev, [it.id]: null }));
                              return;
                            }
                            const kg = fromDisplay(v, "price", unit);
                            setBids((prev) => ({ ...prev, [it.id]: kg }));
                          }}
                          className={
                            "h-9 w-24 text-right tabular-nums focus-visible:ring-[#8B2252]" +
                            (showErr ? " border-destructive focus-visible:ring-destructive" : "")
                          }
                        />
                        {showErr && (
                          <span className="text-[11px] text-destructive max-w-[200px] text-right">
                            {err}
                          </span>
                        )}
                        {Math.abs(d) > 0.001 && (
                          <span
                            className="text-[11px] tabular-nums"
                            style={{ color: d < 0 ? "#15803d" : "#b45309" }}
                          >
                            {d < 0 ? "↓" : "↑"} ${Math.abs(displayDiff).toFixed(2)} ({d < 0 ? "" : "+"}
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

        {/* Cuts — mobile cards */}
        <div className="flex flex-col gap-3 mt-2 sm:hidden">
          {offer.items.map((it) => {
            const fob = Number(it.price);
            const asking = effectiveAsking(fob);
            const bidVal = bids[it.id];
            const bid = typeof bidVal === "number" ? bidVal : asking;
            const d = bid - asking;
            const dPct = asking > 0 ? (d / asking) * 100 : 0;
            const isEmpty = bidVal === null || bidVal === undefined;
            const displayBid = toDisplay(bid, "price", unit);
            const displayDiff = toDisplay(d, "price", unit);
            const err = errors[it.id];
            const showErr = !!err;
            return (
              <div key={it.id} className="rounded-lg border border-border p-3">
                <div className="font-medium text-sm mb-2">{it.customer_product?.name ?? "—"}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">{t("buyer.bid.qty", { unit: wLbl })}</div>
                    <div className="font-semibold tabular-nums">
                      {fmtWeight(Number(it.amount), unit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      Asking · {(incoterm || "").toUpperCase()} ({pLbl})
                    </div>
                    <div className="font-semibold tabular-nums">{fmtPrice(asking, unit)}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">{t("buyer.bid.yourBid")} ({pLbl})</div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={isEmpty ? "" : (Number.isFinite(displayBid) ? displayBid.toFixed(2) : "")}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") { setBids((prev) => ({ ...prev, [it.id]: null })); return; }
                      const v = parseFloat(raw);
                      if (!Number.isFinite(v)) { setBids((prev) => ({ ...prev, [it.id]: null })); return; }
                      setBids((prev) => ({ ...prev, [it.id]: fromDisplay(v, "price", unit) }));
                    }}
                    className={
                      "h-11 w-full text-right tabular-nums focus-visible:ring-[#8B2252]" +
                      (showErr ? " border-destructive focus-visible:ring-destructive" : "")
                    }
                  />
                  {showErr && (
                    <div className="text-[11px] text-destructive mt-1">{err}</div>
                  )}
                  {Math.abs(d) > 0.001 && (
                    <div
                      className="text-[11px] tabular-nums mt-1"
                      style={{ color: d < 0 ? "#15803d" : "#b45309" }}
                    >
                      {d < 0 ? "↓" : "↑"} ${Math.abs(displayDiff).toFixed(2)} ({d < 0 ? "" : "+"}
                      {dPct.toFixed(1)}%)
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
        {selectedFreight && (freightPerKg > 0 || insurancePerKg > 0) && (
          <div className="text-xs text-muted-foreground mt-1">
            Freight US$ {Number(selectedFreight.cost).toLocaleString()} ({fmtPrice(freightPerKg, unit)} {pLbl})
            {insurancePerKg > 0 && selectedFreight.insurance != null && (
              <> · Insurance US$ {Number(selectedFreight.insurance).toLocaleString()} ({fmtPrice(insurancePerKg, unit)} {pLbl})</>
            )}
            {" · "}Totals above already reflect <strong>{(incoterm || "").toUpperCase()}</strong>.
          </div>
        )}

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

        <DialogFooter className="gap-2 sm:gap-2 max-sm:flex-col">
          {errorCount > 0 && (
            <div className="mr-auto text-xs text-destructive self-center">
              {t("buyer.bid.validation.summary", { count: errorCount, defaultValue: "{{count}} cut(s) have validation errors" })}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="max-sm:w-full max-sm:h-11">
            {t("buyer.bid.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{ background: "#8B2252", color: "#fff" }}
            className="hover:opacity-90 max-sm:w-full max-sm:h-11"
          >
            {submitting ? t("buyer.bid.submitting") : t("buyer.bid.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BidModal;