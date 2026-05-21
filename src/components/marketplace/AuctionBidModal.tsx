import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Gavel } from "lucide-react";
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
import { AuctionCountdown } from "./AuctionCountdown";
import {
  type MockAuction,
  auctionClosesAt,
  auctionOpenedAt,
} from "@/data/mockAuctions";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import {
  fmtWeight,
  fmtPrice,
  priceLabel,
  weightLabel,
  toDisplay,
  fromDisplay,
} from "@/lib/units";

type MockCut = { id: string; name: string; qty: number; minBid: number };

// Mocked cuts per auction (qty in kg, minBid in $/kg).
const AUCTION_CUTS: Record<string, MockCut[]> = {
  "ba-1": [
    { id: "ba-1-c1", name: "Beef Forequarter", qty: 14000, minBid: 5.5 },
    { id: "ba-1-c2", name: "Beef Brisket", qty: 13000, minBid: 4.0 },
  ],
  "ba-2": [
    { id: "ba-2-c1", name: "Beef Trimmings 90CL", qty: 27000, minBid: 3.8 },
  ],
  "ba-3": [
    { id: "ba-3-c1", name: "Beef Hindquarter", qty: 14000, minBid: 5.0 },
    { id: "ba-3-c2", name: "Beef Knuckle", qty: 13000, minBid: 4.5 },
  ],
};

function getCutsFor(auction: MockAuction): MockCut[] {
  return (
    AUCTION_CUTS[auction.id] ?? [
      { id: `${auction.id}-c1`, name: auction.title, qty: 27000, minBid: 4.5 },
    ]
  );
}

interface AuctionBidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auction: MockAuction;
}

const WINE = "#8B2252";
const AMBER = "#b45309";

export function AuctionBidModal({ open, onOpenChange, auction }: AuctionBidModalProps) {
  const { t } = useTranslation();
  const { unit } = useWeightUnit();
  const pLbl = priceLabel(unit);
  const wLbl = weightLabel(unit);

  const cuts = useMemo(() => getCutsFor(auction), [auction]);
  const containerOptions = useMemo(
    () => Array.from({ length: Math.max(1, auction.containerCount) }, (_, i) => i + 1),
    [auction.containerCount],
  );

  const [volumeContainers, setVolumeContainers] = useState(1);
  // bids per cut in $/kg (null = empty)
  const [bids, setBids] = useState<Record<string, number | null>>({});
  const [commitmentAcknowledged, setCommitmentAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const [bulkOffset, setBulkOffset] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state whenever the modal opens for a different auction.
  useEffect(() => {
    if (!open) return;
    setVolumeContainers(1);
    setBids(Object.fromEntries(cuts.map((c) => [c.id, null])));
    setCommitmentAcknowledged(false);
    setMessage("");
    setBulkOffset("");
  }, [open, auction.id, cuts]);

  const setAll = (priceFor: (cut: MockCut) => number) => {
    setBids(Object.fromEntries(cuts.map((c) => [c.id, +priceFor(c).toFixed(4)])));
  };

  const applyBulkOffset = () => {
    const v = parseFloat(bulkOffset);
    if (!Number.isFinite(v)) return;
    const deltaKg = fromDisplay(v, "price", unit); // user types in display unit
    setAll((c) => Math.max(0, c.minBid + deltaKg));
  };

  const closesAt = auctionClosesAt(auction);
  const openedAt = auctionOpenedAt(auction);

  const perFclTotal = cuts.reduce(
    (s, c) => s + (typeof bids[c.id] === "number" ? (bids[c.id] as number) : 0) * c.qty,
    0,
  );
  const grandTotal = perFclTotal * volumeContainers;

  const allFilled = cuts.every((c) => {
    const v = bids[c.id];
    return typeof v === "number" && Number.isFinite(v) && v > 0;
  });
  const canSubmit = allFilled && commitmentAcknowledged;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      toast.success(
        t("buyer.auctionBid.successToast", { opp: auction.oppNumber }),
      );
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] max-h-[92vh] overflow-y-auto sm:rounded-lg max-sm:!max-w-full max-sm:!max-h-[100dvh] max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:!m-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel size={18} style={{ color: AMBER }} />
            🔨 {t("buyer.auctionBid.title")}
          </DialogTitle>
          <DialogDescription>{t("buyer.auctionBid.subtitle")}</DialogDescription>
        </DialogHeader>

        {/* Auction info row */}
        <div
          className="rounded-lg border p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
          style={{ borderColor: "rgba(180,83,9,0.25)", background: "rgba(180,83,9,0.04)" }}
        >
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">
            {auction.oppNumber}
          </span>
          <span className="font-medium flex-1 min-w-[200px]">
            <span aria-hidden>{auction.emoji}</span> {auction.title}
          </span>
          <AuctionCountdown closesAt={closesAt} openedAt={openedAt} compact />
        </div>

        {/* Container volume */}
        {auction.containerCount > 1 && (
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-medium text-foreground">
              {t("buyer.auctionBid.howManyContainers")}
            </label>
            <div className="flex flex-wrap gap-2">
              {containerOptions.map((n) => {
                const active = n === volumeContainers;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVolumeContainers(n)}
                    className="h-9 min-w-10 px-3 rounded-md border text-sm font-medium transition-colors"
                    style={{
                      borderColor: active ? AMBER : "hsl(var(--border))",
                      background: active ? "rgba(180,83,9,0.1)" : "transparent",
                      color: active ? AMBER : "hsl(var(--foreground))",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bulk apply — desktop */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs uppercase font-semibold text-muted-foreground mr-1">
            {t("buyer.auctionBid.bulk.label")}
          </span>
          <button
            type="button"
            onClick={() => setAll((c) => c.minBid)}
            className="h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))", color: WINE }}
          >
            {t("buyer.auctionBid.bulk.acceptMin")}
          </button>
          <button
            type="button"
            onClick={() => setAll((c) => c.minBid * 0.95)}
            className="h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))", color: WINE }}
          >
            {t("buyer.auctionBid.bulk.minus5")}
          </button>
          <button
            type="button"
            onClick={() => setAll((c) => c.minBid * 1.05)}
            className="h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))", color: WINE }}
          >
            {t("buyer.auctionBid.bulk.plus5")}
          </button>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              value={bulkOffset}
              onChange={(e) => setBulkOffset(e.target.value)}
              placeholder={`±${pLbl}`}
              className="h-8 w-20 text-right tabular-nums"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={applyBulkOffset}
              style={{ color: WINE }}
            >
              {t("buyer.auctionBid.bulk.apply")}
            </Button>
          </div>
        </div>

        {/* Bulk apply — mobile collapsible */}
        <details className="sm:hidden mt-3">
          <summary className="text-xs font-semibold cursor-pointer py-2" style={{ color: WINE }}>
            ⚡ {t("buyer.auctionBid.bulk.label")}
          </summary>
          <div className="flex flex-wrap gap-2 pt-2 pb-1">
            <button
              type="button"
              onClick={() => setAll((c) => c.minBid)}
              className="h-9 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: WINE }}
            >
              {t("buyer.auctionBid.bulk.acceptMin")}
            </button>
            <button
              type="button"
              onClick={() => setAll((c) => c.minBid * 0.95)}
              className="h-9 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: WINE }}
            >
              {t("buyer.auctionBid.bulk.minus5")}
            </button>
            <button
              type="button"
              onClick={() => setAll((c) => c.minBid * 1.05)}
              className="h-9 px-3 rounded-full border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))", color: WINE }}
            >
              {t("buyer.auctionBid.bulk.plus5")}
            </button>
            <div className="flex items-center gap-1 w-full">
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={bulkOffset}
                onChange={(e) => setBulkOffset(e.target.value)}
                placeholder={`±${pLbl}`}
                className="h-11 flex-1 text-right tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-11 px-4 text-xs"
                onClick={applyBulkOffset}
                style={{ color: WINE }}
              >
                {t("buyer.auctionBid.bulk.apply")}
              </Button>
            </div>
          </div>
        </details>

        {/* Cuts pricing — desktop table */}
        <div className="rounded-lg border border-border overflow-hidden mt-2 hidden sm:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">{t("buyer.auctionBid.col.cut")}</th>
                <th className="px-3 py-2 font-medium text-right">
                  {t("buyer.auctionBid.col.qty", { unit: wLbl })}
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  {t("buyer.auctionBid.col.minBid")} ({pLbl})
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  {t("buyer.auctionBid.col.yourBid")} ({pLbl})
                </th>
              </tr>
            </thead>
            <tbody>
              {cuts.map((c) => {
                const v = bids[c.id];
                const display =
                  typeof v === "number" ? toDisplay(v, "price", unit).toFixed(2) : "";
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtWeight(c.qty, unit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {fmtPrice(c.minBid, unit)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={display}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setBids((p) => ({ ...p, [c.id]: null }));
                            return;
                          }
                          const parsed = parseFloat(raw);
                          if (!Number.isFinite(parsed)) {
                            setBids((p) => ({ ...p, [c.id]: null }));
                            return;
                          }
                          setBids((p) => ({
                            ...p,
                            [c.id]: fromDisplay(parsed, "price", unit),
                          }));
                        }}
                        className="h-9 w-24 ml-auto text-right tabular-nums focus-visible:ring-[#8B2252]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cuts pricing — mobile cards */}
        <div className="flex flex-col gap-3 mt-2 sm:hidden">
          {cuts.map((c) => {
            const v = bids[c.id];
            const display =
              typeof v === "number" ? toDisplay(v, "price", unit).toFixed(2) : "";
            return (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="font-medium text-sm mb-2">{c.name}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">{t("buyer.auctionBid.col.qty", { unit: wLbl })}</div>
                    <div className="font-semibold tabular-nums">{fmtWeight(c.qty, unit)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("buyer.auctionBid.col.minBid")} ({pLbl})</div>
                    <div className="font-semibold tabular-nums">{fmtPrice(c.minBid, unit)}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("buyer.auctionBid.col.yourBid")} ({pLbl})
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={display}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setBids((p) => ({ ...p, [c.id]: null }));
                        return;
                      }
                      const parsed = parseFloat(raw);
                      if (!Number.isFinite(parsed)) {
                        setBids((p) => ({ ...p, [c.id]: null }));
                        return;
                      }
                      setBids((p) => ({
                        ...p,
                        [c.id]: fromDisplay(parsed, "price", unit),
                      }));
                    }}
                    className="h-11 w-full text-right tabular-nums focus-visible:ring-[#8B2252]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div
          className="rounded-lg border p-3 mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"
          style={{ borderColor: "rgba(139,34,82,0.25)", background: "rgba(139,34,82,0.04)" }}
        >
          <div>
            <div className="text-xs text-muted-foreground">
              {t("buyer.auctionBid.totals.perFcl")}
            </div>
            <div className="font-semibold tabular-nums" style={{ color: WINE }}>
              US$ {perFclTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t("buyer.auctionBid.totals.containers")}
            </div>
            <div className="font-semibold tabular-nums">× {volumeContainers}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t("buyer.auctionBid.totals.grand")}
            </div>
            <div className="font-bold tabular-nums text-base" style={{ color: WINE }}>
              US$ {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Commitment */}
        <div className="mt-3 rounded-lg border border-border p-3">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={commitmentAcknowledged}
              onChange={(e) => setCommitmentAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4"
              style={{ accentColor: WINE }}
            />
            <span className="font-medium">{t("buyer.auctionBid.commitment.label")}</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            {t("buyer.auctionBid.commitment.hint")}
          </p>
        </div>

        {/* Message */}
        <div className="mt-2">
          <label className="text-sm font-medium text-foreground">
            {t("buyer.auctionBid.note.label")}
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("buyer.auctionBid.note.placeholder")}
            className="mt-1 min-h-[64px]"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-3 max-sm:flex-col">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="max-sm:w-full max-sm:h-11">
            {t("buyer.auctionBid.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{ background: WINE, color: "#fff" }}
            className="hover:opacity-90 max-sm:w-full max-sm:h-11"
          >
            {submitting
              ? t("buyer.auctionBid.submitting")
              : t("buyer.auctionBid.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AuctionBidModal;