import { Fragment, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Gavel, ArrowLeft, Lock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuctionCountdown } from "@/components/marketplace/AuctionCountdown";
import {
  MOCK_SUPPLIER_AUCTIONS,
  auctionClosesAt,
  auctionOpenedAt,
  type MockAuction,
} from "@/data/mockAuctions";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtPrice, fmtWeight, priceLabel } from "@/lib/units";

const WINE = "#8B2252";

// ── Mock bids ────────────────────────────────────────────────────────────────
type BidStatus = "submitted" | "withdrawn" | "winning" | "lost";
type MockCutBid = { name: string; qty: number; pricePerKg: number };
type MockBid = {
  id: string;
  rank: number;
  buyer: string;
  containers: number;
  totalPerFcl: number;
  avgPerKg: number;
  submittedAt: string;
  status: BidStatus;
  cuts: MockCutBid[];
};

const MOCK_BIDS: Record<string, MockBid[]> = {
  "a-3": [
    {
      id: "b1", rank: 1, buyer: "Hong Kong Foods Ltd", containers: 2,
      totalPerFcl: 185200, avgPerKg: 6.82,
      submittedAt: "2026-01-08 14:23", status: "submitted",
      cuts: [
        { name: "Beef Hindquarter", qty: 14000, pricePerKg: 7.10 },
        { name: "Beef Knuckle", qty: 13000, pricePerKg: 6.50 },
      ],
    },
    {
      id: "b2", rank: 2, buyer: "Delta Imports", containers: 1,
      totalPerFcl: 181500, avgPerKg: 6.69,
      submittedAt: "2026-01-08 09:11", status: "submitted",
      cuts: [
        { name: "Beef Hindquarter", qty: 14000, pricePerKg: 6.95 },
        { name: "Beef Knuckle", qty: 13000, pricePerKg: 6.40 },
      ],
    },
    {
      id: "b3", rank: 3, buyer: "Alpha Foods UAE", containers: 2,
      totalPerFcl: 178900, avgPerKg: 6.59,
      submittedAt: "2026-01-07 16:45", status: "submitted",
      cuts: [
        { name: "Beef Hindquarter", qty: 14000, pricePerKg: 6.85 },
        { name: "Beef Knuckle", qty: 13000, pricePerKg: 6.30 },
      ],
    },
    {
      id: "b4", rank: 4, buyer: "Gamma Buyers", containers: 1,
      totalPerFcl: 172300, avgPerKg: 6.35,
      submittedAt: "2026-01-08 11:02", status: "submitted",
      cuts: [
        { name: "Beef Hindquarter", qty: 14000, pricePerKg: 6.60 },
        { name: "Beef Knuckle", qty: 13000, pricePerKg: 6.05 },
      ],
    },
    {
      id: "b5", rank: 5, buyer: "Tokyo Premium Meats", containers: 1,
      totalPerFcl: 168000, avgPerKg: 6.19,
      submittedAt: "2026-01-07 22:30", status: "withdrawn",
      cuts: [
        { name: "Beef Hindquarter", qty: 14000, pricePerKg: 6.40 },
        { name: "Beef Knuckle", qty: 13000, pricePerKg: 5.95 },
      ],
    },
  ],
};

// Mock supplier reserve price per auction ($/kg)
const RESERVE_PRICE: Record<string, number> = {
  "a-3": 7.0,
  "a-1": 5.5,
  "a-2": 7.2,
  "a-4": 8.0,
  "a-5": 6.0,
  "a-6": 4.2,
};

function bidsForAuction(id: string): MockBid[] {
  return MOCK_BIDS[id] ?? MOCK_BIDS["a-3"];
}

function rankColors(rank: number): { bg: string; fg: string; border: string } {
  if (rank === 1) return { bg: "#fef3c7", fg: "#92400e", border: "#fbbf24" };
  if (rank === 2) return { bg: "#f1f5f9", fg: "#475569", border: "#cbd5e1" };
  if (rank === 3) return { bg: "#fef0e6", fg: "#9a3412", border: "#fb923c" };
  return { bg: "#f3f4f6", fg: "#6b7280", border: "#e5e7eb" };
}

function StatusPill({ status, t }: { status: BidStatus; t: (k: string) => string }) {
  const map: Record<BidStatus, { bg: string; fg: string; dot: string }> = {
    submitted: { bg: "#dcfce7", fg: "#166534", dot: "#16a34a" },
    withdrawn: { bg: "#f3f4f6", fg: "#6b7280", dot: "#9ca3af" },
    winning:   { bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
    lost:      { bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" },
  };
  const m = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: m.bg, color: m.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {t(`supplier.auctionDetail.bidStatus.${status}`)}
    </span>
  );
}

function AuctionStatusBadge({ status, t }: { status: MockAuction["status"]; t: (k: string) => string }) {
  const map: Record<MockAuction["status"], { bg: string; fg: string; prefix: string }> = {
    scheduled: { bg: "#dbeafe", fg: "#1e40af", prefix: "● " },
    open:      { bg: "#dcfce7", fg: "#166534", prefix: "● " },
    closed:    { bg: "#f3f4f6", fg: "#6b7280", prefix: "● " },
    awarded:   { bg: "#fef3c7", fg: "#92400e", prefix: "🔒 " },
    cancelled: { bg: "#fee2e2", fg: "#991b1b", prefix: "● " },
  };
  const m = map[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.prefix}{t(`supplier.auctions.statusBadge.${status}`)}
    </span>
  );
}

export default function SupplierAuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { unit } = useWeightUnit();
  const pLbl = priceLabel(unit);

  const auction = useMemo(
    () => MOCK_SUPPLIER_AUCTIONS.find((a) => a.id === id),
    [id],
  );

  // ── local state ──────────────────────────────────────────────────────────
  const initialBids = useMemo<MockBid[]>(() => {
    if (!auction) return [];
    const list = bidsForAuction(auction.id).map((b) => ({ ...b }));
    if (auction.status === "awarded" && list.length) {
      list[0].status = "winning";
      for (let i = 1; i < list.length; i++) {
        if (list[i].status !== "withdrawn") list[i].status = "lost";
      }
    }
    return list;
  }, [auction]);

  const [bids, setBids] = useState<MockBid[]>(initialBids);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [awardTarget, setAwardTarget] = useState<MockBid | null>(null);
  const [reserveBannerDismissed, setReserveBannerDismissed] = useState(false);

  if (!auction) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate("/supplier/auctions")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> {t("supplier.auctionDetail.back")}
        </button>
        <div className="empty-state mt-4">
          <Gavel size={28} />
          <p>{t("supplier.auctionDetail.notFound")}</p>
        </div>
      </div>
    );
  }

  const reserve = RESERVE_PRICE[auction.id] ?? 0;
  const closesAt = auctionClosesAt(auction);
  const openedAt = auctionOpenedAt(auction);

  const active = bids.filter((b) => b.status !== "withdrawn");
  const totalBids = bids.length;
  const highestBid = active.reduce((m, b) => Math.max(m, b.totalPerFcl), 0);
  const lowestBid = active.length
    ? active.reduce((m, b) => Math.min(m, b.totalPerFcl), Number.POSITIVE_INFINITY)
    : 0;
  const highestPerKg = active.reduce((m, b) => Math.max(m, b.avgPerKg), 0);
  const reserveMet = highestPerKg >= reserve;
  const reserveGapPct = reserve > 0 ? ((reserve - highestPerKg) / reserve) * 100 : 0;

  const winner = bids.find((b) => b.status === "winning");

  function handleAwardConfirm() {
    if (!awardTarget) return;
    setBids((prev) =>
      prev.map((b) =>
        b.id === awardTarget.id
          ? { ...b, status: "winning" as BidStatus }
          : b.status === "withdrawn"
            ? b
            : { ...b, status: "lost" as BidStatus },
      ),
    );
    toast.success(t("supplier.auctionDetail.awardToast", { buyer: awardTarget.buyer }));
    setAwardTarget(null);
  }

  function handleCancelAuction() {
    toast(t("supplier.auctionDetail.cancelledToast"));
  }

  const isOpen = auction.status === "open";
  const isClosed = auction.status === "closed";
  const isAwarded = auction.status === "awarded" || !!winner;

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/supplier/auctions")}
        className="btn-back inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft size={14} /> {t("supplier.auctionDetail.back")}
      </button>

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Gavel size={12} />
              <span className="font-mono">{auction.oppNumber}</span>
              <span>·</span>
              <span>{auction.supplier}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight">
              <span aria-hidden>{auction.emoji}</span> {auction.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{auction.containerCount}×{auction.containerSize}</span>
              <span>·</span>
              <span>{auction.incoterm}</span>
              <span>·</span>
              <span>{auction.shipmentPeriod}</span>
              <span>·</span>
              <span>{auction.originCountry} → {auction.destCountry}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AuctionStatusBadge status={auction.status} t={t} />
            {isOpen && closesAt && (
              <AuctionCountdown closesAt={closesAt} openedAt={openedAt} compact />
            )}
          </div>
        </div>
      </div>

      {/* OPEN state */}
      {isOpen && (
        <div className="mt-4 rounded-xl border p-5 text-center"
             style={{ borderColor: "rgba(180,83,9,0.25)", background: "rgba(180,83,9,0.04)" }}>
          <Gavel size={28} className="mx-auto mb-2" style={{ color: "#b45309" }} />
          <h2 className="text-lg font-semibold">{t("supplier.auctionDetail.inProgress.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {t("supplier.auctionDetail.inProgress.message")}
          </p>
          <div className="mt-4 inline-flex items-center gap-4 rounded-lg bg-background border border-border px-4 py-3">
            <div className="text-left">
              <div className="text-[11px] uppercase text-muted-foreground">
                {t("supplier.auctionDetail.inProgress.bidsReceived")}
              </div>
              <div className="text-xl font-semibold tabular-nums">{auction.bidsCount}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <AuctionCountdown closesAt={closesAt} openedAt={openedAt} showProgress />
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleCancelAuction}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              {t("supplier.auctionDetail.cancelAuction")}
            </Button>
          </div>
        </div>
      )}

      {/* Awarded banner */}
      {isAwarded && winner && (
        <div
          className="mt-4 rounded-xl border p-4 flex items-center gap-3"
          style={{ borderColor: "#fbbf24", background: "#fffbeb" }}
        >
          <Lock size={18} style={{ color: "#92400e" }} />
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: "#92400e" }}>
              🔒 {t("supplier.auctionDetail.awardedBanner", { buyer: winner.buyer })}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("supplier.auctionDetail.contractIssued")}
            </div>
          </div>
        </div>
      )}

      {/* Post-award Next Steps */}
      {isAwarded && winner && (
        <div
          className="mt-4 rounded-xl border p-5"
          style={{ borderColor: "#bbf7d0", background: "#f0fdf4" }}
        >
          <div className="font-semibold text-sm mb-3" style={{ color: "#166534" }}>
            {t("supplier.auctionDetail.nextSteps.title", { defaultValue: "Next steps" })}
          </div>
          <ul className="space-y-2 text-sm text-foreground/90">
            <li className="flex gap-2">
              <span>✉️</span>
              <span>{t("supplier.auctionDetail.nextSteps.notified", { defaultValue: "Buyer has been notified and has 48 hours to confirm." })}</span>
            </li>
            <li className="flex gap-2">
              <span>📋</span>
              <span>{t("supplier.auctionDetail.nextSteps.becomesOrder", { defaultValue: "Once confirmed, this becomes a Sales Order." })}</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => navigate("/supplier/sales")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("supplier.auctionDetail.nextSteps.viewSales", { defaultValue: "View in Sales" })} →
          </button>
        </div>
      )}

      {/* CLOSED / AWARDED — bid results */}
      {(isClosed || isAwarded) && (
        <>
          {/* Reserve not met banner */}
          {!reserveMet && !isAwarded && !reserveBannerDismissed && (
            <div
              className="mt-4 rounded-xl border p-4"
              style={{ borderColor: "#fde68a", background: "#fffbeb" }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} style={{ color: "#b45309" }} className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: "#92400e" }}>
                    {t("supplier.auctionDetail.reserveNotMet.title")}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {t("supplier.auctionDetail.reserveNotMet.body", {
                      reserve: fmtPrice(reserve, unit),
                      highest: fmtPrice(highestPerKg, unit),
                      gap: reserveGapPct.toFixed(1),
                      unit: pLbl,
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      style={{ background: WINE, color: "#fff" }}
                      onClick={() => active[0] && setAwardTarget(active[0])}
                    >
                      {t("supplier.auctionDetail.reserveNotMet.awardAnyway")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast(t("supplier.auctionDetail.reserveNotMet.extendedToast"))}
                    >
                      {t("supplier.auctionDetail.reserveNotMet.extend")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReserveBannerDismissed(true)}
                    >
                      {t("supplier.auctionDetail.reserveNotMet.closeWithout")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label={t("supplier.auctionDetail.summary.totalBids")}
                         value={String(totalBids)} />
            <SummaryCard label={t("supplier.auctionDetail.summary.highest")}
                         value={`US$ ${highestBid.toLocaleString()}`}
                         hint={t("supplier.auctionDetail.summary.perFcl")} />
            <SummaryCard label={t("supplier.auctionDetail.summary.lowest")}
                         value={`US$ ${(lowestBid || 0).toLocaleString()}`}
                         hint={t("supplier.auctionDetail.summary.perFcl")} />
            <SummaryCard
              label={
                <span className="inline-flex items-center gap-1">
                  <Lock size={11} /> {t("supplier.auctionDetail.summary.reserve")}
                </span>
              }
              value={`US$ ${fmtPrice(reserve, unit)}`}
              hint={pLbl}
            />
          </div>

          {/* Bid rankings — desktop table */}
          <div className="mt-5 rounded-xl border border-border overflow-hidden hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium w-14">{t("supplier.auctionDetail.col.rank")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("supplier.auctionDetail.col.buyer")}</th>
                  <th className="px-3 py-2.5 font-medium text-right">{t("supplier.auctionDetail.col.containers")}</th>
                  <th className="px-3 py-2.5 font-medium text-right">{t("supplier.auctionDetail.col.totalPerFcl")}</th>
                  <th className="px-3 py-2.5 font-medium text-right">{t("supplier.auctionDetail.col.avgPerKg")} ({pLbl})</th>
                  <th className="px-3 py-2.5 font-medium">{t("supplier.auctionDetail.col.submittedAt")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("supplier.auctionDetail.col.status")}</th>
                  <th className="px-3 py-2.5 font-medium text-right">{t("supplier.auctionDetail.col.action")}</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => {
                  const isExp = expanded === b.id;
                  const rc = rankColors(b.rank);
                  const isWin = b.status === "winning";
                  return (
                    <Fragment key={b.id}>
                      <tr
                        className="border-t border-border cursor-pointer hover:bg-muted/30"
                        style={isWin ? { background: "rgba(34,197,94,0.06)" } : undefined}
                        onClick={() => setExpanded(isExp ? null : b.id)}
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border"
                            style={{ background: rc.bg, color: rc.fg, borderColor: rc.border }}
                          >
                            #{b.rank}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{b.buyer}</span>
                            {isExp ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{b.containers}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                          US$ {b.totalPerFcl.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {fmtPrice(b.avgPerKg, unit)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{b.submittedAt}</td>
                        <td className="px-3 py-2.5"><StatusPill status={b.status} t={t} /></td>
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          {b.status === "submitted" && !isAwarded ? (
                            <Button
                              size="sm"
                              style={{ background: WINE, color: "#fff" }}
                              className="hover:opacity-90"
                              onClick={() => setAwardTarget(b)}
                            >
                              {t("supplier.auctionDetail.award")} →
                            </Button>
                          ) : b.status === "winning" ? (
                            <span className="text-xs font-semibold" style={{ color: "#15803d" }}>
                              ✓ {t("supplier.auctionDetail.winner")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                      {isExp && (
                        <tr className="bg-muted/20 border-t border-border">
                          <td colSpan={8} className="px-6 py-3">
                            <CutBreakdown cuts={b.cuts} unit={unit} t={t} pLbl={pLbl} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bid rankings — mobile cards */}
          <div className="mt-5 flex flex-col gap-2.5 lg:hidden">
            {bids.map((b) => {
              const isExp = expanded === b.id;
              const rc = rankColors(b.rank);
              const isWin = b.status === "winning";
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border bg-card p-3"
                  style={isWin ? { borderColor: "#22c55e", background: "rgba(34,197,94,0.06)" } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border shrink-0"
                      style={{ background: rc.bg, color: rc.fg, borderColor: rc.border }}
                    >
                      #{b.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{b.buyer}</div>
                      <div className="text-[11px] text-muted-foreground">{b.submittedAt}</div>
                    </div>
                    <StatusPill status={b.status} t={t} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">{t("supplier.auctionDetail.col.containers")}</div>
                      <div className="font-semibold tabular-nums">{b.containers}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t("supplier.auctionDetail.col.totalPerFcl")}</div>
                      <div className="font-semibold tabular-nums">US$ {b.totalPerFcl.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{pLbl}</div>
                      <div className="font-semibold tabular-nums">{fmtPrice(b.avgPerKg, unit)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(isExp ? null : b.id)}
                      className="text-xs text-muted-foreground inline-flex items-center gap-1"
                    >
                      {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {t(isExp ? "supplier.auctionDetail.hideCuts" : "supplier.auctionDetail.viewCuts")}
                    </button>
                    {b.status === "submitted" && !isAwarded ? (
                      <Button
                        size="sm"
                        style={{ background: WINE, color: "#fff" }}
                        className="hover:opacity-90"
                        onClick={() => setAwardTarget(b)}
                      >
                        {t("supplier.auctionDetail.award")} →
                      </Button>
                    ) : b.status === "winning" ? (
                      <span className="text-xs font-semibold" style={{ color: "#15803d" }}>
                        ✓ {t("supplier.auctionDetail.winner")}
                      </span>
                    ) : null}
                  </div>
                  {isExp && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <CutBreakdown cuts={b.cuts} unit={unit} t={t} pLbl={pLbl} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Award confirmation dialog */}
      <Dialog open={!!awardTarget} onOpenChange={(o) => { if (!o) setAwardTarget(null); }}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {t("supplier.auctionDetail.awardDialog.title", { buyer: awardTarget?.buyer ?? "" })}
            </DialogTitle>
            <DialogDescription>
              {t("supplier.auctionDetail.awardDialog.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {awardTarget && (
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("supplier.auctionDetail.col.containers")}</span>
                <span className="font-medium tabular-nums">{awardTarget.containers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("supplier.auctionDetail.col.totalPerFcl")}</span>
                <span className="font-semibold tabular-nums">US$ {awardTarget.totalPerFcl.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("supplier.auctionDetail.col.avgPerKg")} ({pLbl})</span>
                <span className="font-medium tabular-nums">{fmtPrice(awardTarget.avgPerKg, unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("supplier.auctionDetail.awardDialog.grandTotal")}</span>
                <span className="font-bold tabular-nums" style={{ color: WINE }}>
                  US$ {(awardTarget.totalPerFcl * awardTarget.containers).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t("supplier.auctionDetail.awardDialog.notice")}
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setAwardTarget(null)}>
              {t("supplier.auctionDetail.awardDialog.cancel")}
            </Button>
            <Button
              onClick={handleAwardConfirm}
              style={{ background: WINE, color: "#fff" }}
              className="hover:opacity-90"
            >
              {t("supplier.auctionDetail.awardDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: React.ReactNode;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function CutBreakdown({
  cuts,
  unit,
  t,
  pLbl,
}: {
  cuts: MockCutBid[];
  unit: "kg" | "lbs";
  t: (k: string, opts?: Record<string, unknown>) => string;
  pLbl: string;
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1 font-medium">{t("supplier.auctionDetail.col.cut")}</th>
          <th className="py-1 font-medium text-right">{t("supplier.auctionDetail.col.qty")}</th>
          <th className="py-1 font-medium text-right">{t("supplier.auctionDetail.col.bidPerKg")} ({pLbl})</th>
          <th className="py-1 font-medium text-right">{t("supplier.auctionDetail.col.total")}</th>
        </tr>
      </thead>
      <tbody>
        {cuts.map((c, i) => (
          <tr key={i} className="border-t border-border/50">
            <td className="py-1.5">{c.name}</td>
            <td className="py-1.5 text-right tabular-nums">{fmtWeight(c.qty, unit)}</td>
            <td className="py-1.5 text-right tabular-nums">{fmtPrice(c.pricePerKg, unit)}</td>
            <td className="py-1.5 text-right tabular-nums font-medium">
              US$ {(c.pricePerKg * c.qty).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}