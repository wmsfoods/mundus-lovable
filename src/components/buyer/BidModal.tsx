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

// Mock buyer identity until auth wiring is connected to the marketplace flow.
const MOCK_BUYER_COMPANY_ID = "00000000-0000-beef-0000-000000000001";
const MOCK_BUYER_USER_ID = "c3000001-0000-0000-0000-000000000001";

const MIN_BID_PCT = 0.9; // initial bid must be ≥ 90% of asking

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

type DraftShape = {
  incoterm?: string;
  portId?: string;
  message?: string;
  bids?: Record<string, number>;
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
  // bids stored as $/kg
  // null = empty input (user cleared it). Numbers stored as $/kg.
  const [bids, setBids] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(offer.items.map((it) => [it.id, Number(it.price)])),
  );
  const hydratedRef = useRef(false);
  const [bulkOffset, setBulkOffset] = useState<string>("");

  const applyAllBids = (priceFor: (askingKg: number) => number) => {
    setBids(
      Object.fromEntries(
        offer.items.map((it) => [it.id, +priceFor(Number(it.price)).toFixed(4)]),
      ),
    );
  };
  const applyBulkOffset = () => {
    const v = parseFloat(bulkOffset);
    if (!Number.isFinite(v)) return;
    const deltaKg = fromDisplay(v, "price", unit);
    applyAllBids((asking) => Math.max(0, asking + deltaKg));
  };

  useEffect(() => {
    if (!open) return;
    const draft = loadDraft(offer.id);
    setBids(
      Object.fromEntries(
        offer.items.map((it) => [it.id, draft?.bids?.[it.id] ?? Number(it.price)]),
      ),
    );
    setIncoterm(draft?.incoterm ?? allowedIncoterms[0] ?? "CFR");
    setMessage(draft?.message ?? "");
    hydratedRef.current = true;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("freight_options")
        .select("id, cost, port:ports(id, name, country:countries(english_name))")
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
    saveDraft(offer.id, { incoterm, portId, message, bids: cleanBids });
  }, [open, offer.id, incoterm, portId, message, bids]);

  const selectedFreight = freight.find((f) => f.port?.id === portId);
  const totalKg = offer.items.reduce((s, it) => s + Number(it.amount), 0);
  const freightPerKg = selectedFreight && totalKg > 0 ? Number(selectedFreight.cost) / totalKg : 0;

  const askingTotal = offer.items.reduce((s, it) => s + Number(it.price) * Number(it.amount), 0);
  const bidTotal = offer.items.reduce(
    (s, it) => s + (typeof bids[it.id] === "number" ? (bids[it.id] as number) : 0) * Number(it.amount),
    0,
  );
  const diff = bidTotal - askingTotal;
  const diffPct = askingTotal > 0 ? (diff / askingTotal) * 100 : 0;

  // ── Validation (only enforced for real offers) ──────────────────────────
  const errors = useMemo(() => {
    if (!isRealOffer) return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const it of offer.items) {
      const asking = Number(it.price);
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
    }
    return out;
  }, [isRealOffer, offer.items, bids, t, unit]);
  const errorCount = Object.keys(errors).length;

  const allFilled = offer.items.every((it) => {
    const v = bids[it.id];
    return typeof v === "number" && Number.isFinite(v) && v > 0;
  });
  const canSubmit = allFilled && (!isRealOffer || errorCount === 0);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      // Check if buyer already has an active negotiation for this offer
      const { data: existing } = await supabase
        .from("negotiations")
        .select("id, status")
        .eq("offer_id", offer.id)
        .eq("buyer_company_id", MOCK_BUYER_COMPANY_ID)
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
          buyer_company_id: MOCK_BUYER_COMPANY_ID,
          created_by_user_id: MOCK_BUYER_USER_ID,
          port_id: portId || null,
          freight_cost_per_kg: freightPerKg,
          fcl_count: offer.total_fcl ?? 1,
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
          created_by_user_id: MOCK_BUYER_USER_ID,
        })
        .select("id")
        .single();
      if (rpErr || !rp) throw rpErr ?? new Error("round_proposals insert failed");

      const cutRows = offer.items.map((it) => ({
        round_proposal_id: rp.id,
        offer_item_id: it.id,
        price_per_kg: (typeof bids[it.id] === "number" ? (bids[it.id] as number) : Number(it.price)),
        quantity_kg: Number(it.amount),
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
      clearDraft(offer.id);
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
                {t("buyer.bid.freightCost")}: US$ {Number(selectedFreight.cost).toLocaleString()} ({pLbl}{" "}
                {fmtPrice(freightPerKg, unit)})
              </span>
            )}
          </label>
        </div>

        {/* Bulk apply — desktop */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs uppercase font-semibold text-muted-foreground mr-1">
            {t("buyer.bid.bulk.label", "Quick fill")}:
          </span>
          <button
            type="button"
            onClick={() => applyAllBids((a) => a)}
            className="h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
          >
            {t("buyer.bid.bulk.acceptAsking", "Accept asking")}
          </button>
          <button
            type="button"
            onClick={() => applyAllBids((a) => a * 0.95)}
            className="h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
          >
            {t("buyer.bid.bulk.minus5", "Asking -5%")}
          </button>
          <button
            type="button"
            onClick={() => applyAllBids((a) => a * 0.9)}
            className="h-7 px-3 rounded-full border text-xs font-medium hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
          >
            {t("buyer.bid.bulk.minus10", "Asking -10%")}
          </button>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              value={bulkOffset}
              onChange={(e) => setBulkOffset(e.target.value)}
              placeholder={t("buyer.bid.bulk.customPlaceholder", { defaultValue: "±{{unit}}", unit: pLbl })}
              className="h-7 w-20 text-right tabular-nums text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={applyBulkOffset}
              style={{ color: "#8B2252" }}
            >
              {t("buyer.bid.bulk.apply", "Apply")}
            </Button>
          </div>
        </div>

        {/* Bulk apply — mobile collapsible */}
        <details className="sm:hidden mt-3">
          <summary className="text-xs font-semibold cursor-pointer py-2" style={{ color: "#8B2252" }}>
            ⚡ {t("buyer.bid.bulk.label", "Quick fill")}
          </summary>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            <button
              type="button"
              onClick={() => applyAllBids((a) => a)}
              className="h-9 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
            >
              {t("buyer.bid.bulk.acceptAsking", "Accept asking")}
            </button>
            <button
              type="button"
              onClick={() => applyAllBids((a) => a * 0.95)}
              className="h-9 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
            >
              {t("buyer.bid.bulk.minus5", "Asking -5%")}
            </button>
            <button
              type="button"
              onClick={() => applyAllBids((a) => a * 0.9)}
              className="h-9 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: "#8B2252" }}
            >
              {t("buyer.bid.bulk.minus10", "Asking -10%")}
            </button>
            <div className="flex items-center gap-1 w-full">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={bulkOffset}
                onChange={(e) => setBulkOffset(e.target.value)}
                placeholder={t("buyer.bid.bulk.customPlaceholder", { defaultValue: "±{{unit}}", unit: pLbl })}
                className="h-11 flex-1 text-right tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 px-4 text-xs"
                onClick={applyBulkOffset}
                style={{ color: "#8B2252" }}
              >
                {t("buyer.bid.bulk.apply", "Apply")}
              </Button>
            </div>
          </div>
        </details>

        {/* Cuts — desktop table */}
        <div className="rounded-lg border border-border overflow-hidden mt-2 hidden sm:block">
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
                    <td className="px-3 py-2 text-right tabular-nums">{fmtWeight(Number(it.amount), unit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPrice(asking, unit)}</td>
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
            const asking = Number(it.price);
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
                    <div className="font-semibold tabular-nums">{fmtWeight(Number(it.amount), unit)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("buyer.bid.asking")} ({pLbl})</div>
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