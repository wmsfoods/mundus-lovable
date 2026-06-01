import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { countryFlag } from "@/lib/countryFlags";
import {
  ArrowLeftIcon,
  ArrowsLeftRightIcon,
  CheckIcon,
  XIcon,
  KnifeForkIcon,
} from "@/components/icons";
import {
  useBuyerNegotiation,
  type BuyerNegotiationDetail,
} from "@/hooks/useBuyerNegotiations";
import { useRealNegotiation, isUuid } from "@/hooks/useRealNegotiation";
import { CounterOfferModal } from "@/components/supplier/CounterOfferModal";
import { acceptNegotiation } from "@/components/supplier/CounterOfferActions";
import { RejectNegotiationModal } from "@/components/negotiation/RejectNegotiationModal";
import { CloseDealDialog } from "@/components/common/CloseDealDialog";
import { closeDealFromNegotiation } from "@/lib/closeDeal";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { NegotiationChat } from "@/components/negotiation/NegotiationChat";
import { isChatEnabled } from "@/lib/negotiationEngine";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, weightLabel, LB_PER_KG } from "@/lib/units";
import { NegotiationProgressCard } from "@/components/negotiation/NegotiationProgressCard";
import { ExpirationTimer } from "@/components/negotiation/ExpirationTimer";
import { DealClosedBanner } from "@/components/negotiation/DealClosedBanner";
import { PendingConfirmationBanner } from "@/components/negotiation/PendingConfirmationBanner";
import { DealProgressionCard } from "@/components/negotiation/DealProgressionCard";
import { PriceHistoryTable } from "@/components/negotiation/PriceHistoryTable";
import { NegotiationActivityTab } from "@/components/negotiation/NegotiationActivityTab";
import { OfferAvailabilityChip } from "@/components/negotiation/OfferAvailabilityChip";
import { useStackHeader } from "@/contexts/StackHeaderContext";
import {
  isCounterExhausted,
  isFinalDisplayRound,
  isNegotiationExpired,
  getDisplayRound,
  getMaxRaw,
  MAX_DISPLAY_ROUNDS,
} from "@/lib/negotiationEngine";

function fmtUsd(v: number, fractionDigits = 0) {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v)}`;
}
function fmtSignedUsd(v: number) {
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(v))}`;
}
function fmtDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" })
    .format(new Date(iso));
}
function fmtDateShort(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit" }).format(new Date(iso));
}
function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE").format(v);
}

export default function BuyerNegotiationDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { data } = useBuyerNegotiation(id);
  const isReal = isUuid(id);
  const { data: rawNeg, refetch } = useRealNegotiation(isReal ? id : undefined);
  const [counterOpen, setCounterOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [closeDealOpen, setCloseDealOpen] = useState(false);
  const [closingDeal, setClosingDeal] = useState(false);
  const { user } = useAuth();
  const { company } = useCurrentCompany();
  const { unit } = useWeightUnit();
  const locale = i18n.language || "en";
  useStackHeader({ title: data?.parentTitle ?? "Negotiation" });

  if (!data) {
    return (
      <>
        <Link to="/buyer/negotiations" className="nd-back">
          <ArrowLeftIcon size={16} />
          {t("buyer.negotiations.detail.back")}
        </Link>
        <div className="detail-empty">
          <p>{t("buyer.negotiations.empty")}</p>
        </div>
      </>
    );
  }

  const d: BuyerNegotiationDetail = data;
  const gapAbs = d.supplierCounterUsd - d.yourBidUsd;
  const gapPct = (gapAbs / d.yourBidUsd) * 100;
  const knobPct = Math.max(0, Math.min(100, 50 + gapPct * 10));

  const handleCounter = () => {
    if (offerInactive) {
      toast.error("The supplier has deactivated this offer.");
      return;
    }
    if (isReal && rawNeg) {
      setCounterOpen(true);
    } else {
      toast(t("buyer.negotiations.detail.toast.counter"));
    }
  };
  const handleAccept = async () => {
    if (offerInactive) {
      toast.error("The supplier has deactivated this offer.");
      return;
    }
    if (isReal && rawNeg) {
      setCloseDealOpen(true);
    } else {
      toast.success(t("buyer.negotiations.detail.toast.accepted"));
    }
  };

  const handleConfirmCloseDeal = async () => {
    if (!isReal || !rawNeg) return;
    if (!user?.id) {
      toast.error("Please sign in.");
      return;
    }
    if (closingDeal) return;
    setClosingDeal(true);
    try {
      const items = rawNeg.offer?.items ?? [];
      const cutName = items[0]?.customer_product?.name ?? "Offer";
      const totalValue = items.reduce(
        (s: number, it: any) => s + Number(it.price) * Number(it.amount || 0),
        0,
      );
      await closeDealFromNegotiation({
        negotiationId: rawNeg.id,
        buyerUserId: user.id,
        supplierCompanyId: rawNeg.offer?.supplier_id,
        supplierName: rawNeg.offer?.supplier_name ?? d.supplierName ?? "Supplier",
        buyerCompany: company?.name ?? "Buyer",
        offerNumber: String(rawNeg.offer?.offer_number ?? ""),
        cutName,
        totalValue,
      });
      toast.success(t("common.closeDealDialog.title"));
      setCloseDealOpen(false);
      refetch();
    } catch (err: any) {
      console.error("[closeDeal] failed", err);
      toast.error(String(err?.message ?? err ?? "Failed to close deal"));
    } finally {
      setClosingDeal(false);
    }
  };

  const handleReject = () => {
    if (isReal && rawNeg) {
      setRejectOpen(true);
    } else {
      toast(t("buyer.negotiations.detail.toast.rejected"));
    }
  };

  const showActions = d.status === "action_required" || d.status === "final_round";
  const realDisplayRound = rawNeg ? getDisplayRound(getMaxRaw(rawNeg)) : 0;
  const realIsFinal = !!rawNeg && isFinalDisplayRound(realDisplayRound);
  const realExhausted = !!rawNeg && isCounterExhausted(rawNeg);
  const realExpired = !!rawNeg && isNegotiationExpired(rawNeg);
  const realAccepted = !!rawNeg && rawNeg.status === "bid_accepted";
  const realPending = !!rawNeg && (rawNeg as any).status === "pending_confirmation";
  const acceptedBy = (rawNeg as any)?.accepted_by as "buyer" | "supplier" | null;
  const canConfirmAsCounterparty = realPending && acceptedBy === "supplier";
  const counterAllowed =
    !isReal || (!realExhausted && !realExpired && !realAccepted && !realPending);
  const offerInactive = !!rawNeg && (rawNeg.offer?.status ?? "active") !== "active";
  const maxRoundShown = Math.min(
    MAX_DISPLAY_ROUNDS,
    Math.max(...d.rounds.map((r) => r.round), 1),
  );

  return (
    <>
      <Link to="/buyer/negotiations" className="nd-back">
        <ArrowLeftIcon size={16} />
        {t("buyer.negotiations.detail.back")}
      </Link>

      {/* Header */}
      <div className="nd-header">
        <span className="nd-avatar" aria-hidden="true">
          <KnifeForkIcon size={20} />
        </span>
        <div className="nd-h-text">
          <h1>{d.parentTitle}</h1>
          <div className="nd-sub">
            ID <span className="mono">{d.supplierInternalId}</span> · {d.oppWmsRef} · {d.supplierName}
          </div>
        </div>
        <div className="nd-h-right">
          {isReal && rawNeg?.expires_at ? (
            <ExpirationTimer expiresAt={rawNeg.expires_at} />
          ) : d.expiresIn ? (
            <span className="nd-timer">⏱ {d.expiresIn}</span>
          ) : null}
          {d.status === "action_required" && (
            <span className="pill pill-action-required">
              {t("buyer.negotiations.detail.banner.actionRequired")}
            </span>
          )}
        </div>
      </div>

      {/* Meta chips */}
      <div className="nd-meta-chips">
        <span className="chip">
          <span className="chip-label">{t("buyer.negotiations.detail.meta.incoterm")}:</span>
          <span className="chip-value">{d.incoterm}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.negotiations.detail.meta.origin")}:</span>
          <span className="chip-value">{countryFlag(d.originCountry)} {d.originCountry}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.negotiations.detail.meta.port")}:</span>
          <span className="chip-value">{d.originPort}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.negotiations.detail.meta.payment")}:</span>
          <span className="chip-value">{d.paymentTerms}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.negotiations.detail.meta.fcls")}:</span>
          <span className="chip-value">{d.fclCount}</span>
        </span>
        <OfferAvailabilityChip
          offerId={rawNeg?.offer?.id ?? rawNeg?.offer_id}
          totalFcl={rawNeg?.offer?.total_fcl}
          thisNegotiationFcl={d.fclCount}
        />
        <span className="chip">
          <span className="chip-label">{t("buyer.negotiations.detail.meta.weight")}:</span>
          <span className="chip-value">{fmtWeight(d.totalWeightKg, unit)} {weightLabel(unit)}</span>
        </span>
      </div>

      {isReal && rawNeg && <NegotiationProgressCard negotiation={rawNeg} />}
      {isReal && rawNeg?.supplier_message && (
        <div
          className="rounded-md border px-3 py-2 mb-3 text-sm"
          style={{ background: "#f5f3ff", borderColor: "#ddd6fe", color: "#4c1d95" }}
        >
          <div className="text-xs font-semibold uppercase mb-1 opacity-70">
            {t("buyer.negotiations.detail.noteFromSupplier", "Note from supplier")}
          </div>
          <div className="whitespace-pre-wrap">{rawNeg.supplier_message}</div>
        </div>
      )}
      {isReal && rawNeg && realAccepted && (
        <DealClosedBanner negotiation={rawNeg} perspective="buyer" />
      )}
      {isReal && rawNeg && realPending && (
        <PendingConfirmationBanner
          negotiation={rawNeg}
          perspective="buyer"
          canConfirm={canConfirmAsCounterparty}
          onConfirmed={() => refetch()}
        />
      )}
      {isReal && realIsFinal && !realAccepted && !realExpired && (
        <div
          className="rounded-md px-3 py-3 mb-3 border"
          style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }}
        >
          <div className="font-bold text-sm" style={{ color: "#92400e" }}>⚠️ Final Round</div>
          <div className="text-sm mt-1" style={{ color: "#78350f" }}>
            This is the last round of negotiation on this offer. You can accept the supplier's counter, reject, or send a message.
          </div>
        </div>
      )}
      {isReal && realExpired && !realAccepted && (
        <div
          className="rounded-md px-3 py-2 mb-3 text-sm font-medium border"
          style={{ background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" }}
        >
          {t("engine.expiredBanner", "This negotiation has expired and can no longer receive responses.")}
        </div>
      )}

      {isReal && rawNeg?.status === "offer_rejected" && (
        <div className="rounded-md px-4 py-3 mb-3 border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
          <div className="font-semibold text-sm" style={{ color: "#b91c1c" }}>
            Supplier rejected your bid
          </div>
          {rawNeg.rejection_cooldown_until && new Date(rawNeg.rejection_cooldown_until) > new Date() ? (
            <div className="text-xs mt-1" style={{ color: "#991b1b" }}>
              You can restart negotiating this offer in {Math.ceil((new Date(rawNeg.rejection_cooldown_until).getTime() - Date.now()) / 3_600_000)} hours, if still available.
            </div>
          ) : (
            <div className="text-xs mt-1" style={{ color: "#166534" }}>
              ✅ Cooldown period has passed. You can negotiate this offer again if still available.
            </div>
          )}
          <a href="/buyer/offers" className="text-xs font-medium mt-2 inline-block" style={{ color: "#8B2252" }}>
            🔍 Check similar offers on marketplace →
          </a>
        </div>
      )}

      {isReal && rawNeg?.status === "offer_withdrawn" && (
        <div className="rounded-md px-4 py-3 mb-3 border" style={{ background: "#fffbeb", borderColor: "#fcd34d" }}>
          <div className="font-semibold text-sm" style={{ color: "#92400e" }}>
            Offer no longer available
          </div>
          <div className="text-xs mt-1" style={{ color: "#78350f" }}>
            The supplier has withdrawn this offer. It may have been sold or revised.
          </div>
          <a href="/buyer/offers" className="text-xs font-medium mt-2 inline-block" style={{ color: "#8B2252" }}>
            🔍 Check similar offers on marketplace →
          </a>
        </div>
      )}

      {isReal && offerInactive && rawNeg?.status !== "offer_withdrawn" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#fef3cd",
            border: "1px solid #ffc107",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#856404" }}>
              Offer deactivated by supplier
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              The supplier has deactivated this offer. This negotiation can no longer proceed.
            </div>
          </div>
        </div>
      )}

      {/* Full-width price history — placed above the negotiation grid */}
      <PriceHistoryTable
        products={d.products}
        maxRoundShown={maxRoundShown}
      />

      <div className="nd-grid">
        {/* LEFT */}
        <div>
          <div className="nd-card">
            <div className="nd-card-head">
              <span className="nd-round-badge">
                {t("buyer.negotiations.detail.roundOf", { round: d.round, max: d.maxRounds })}
              </span>
              <span className="nd-updated">
                {t("buyer.negotiations.detail.updated", { date: fmtDate(d.updatedAt, locale) })}
              </span>
            </div>

            {d.status === "final_round" && (
              <div className="nd-banner final-round">
                {t("buyer.negotiations.detail.banner.finalRound")}
              </div>
            )}
            {d.status === "accepted" && (
              <div className="nd-banner success">
                {t("buyer.negotiations.detail.banner.accepted", { price: fmtUsd(d.supplierCounterUsd) })}
              </div>
            )}
            {d.status === "rejected" && (
              <div className="nd-banner danger">
                {t("buyer.negotiations.detail.banner.rejected")}
              </div>
            )}
            {d.status === "expired" && (
              <div className="nd-banner muted">
                {t("buyer.negotiations.detail.banner.expired")}
              </div>
            )}

            <p className="nd-summary">
              {t("buyer.negotiations.detail.summary", { supplier: d.supplierName, round: d.round })}
            </p>

            <div className="nd-stats">
              <div className="nd-stat">
                <span className="nd-stat-label">{t("buyer.negotiations.detail.stats.asking")}</span>
                <span className="nd-stat-value">{fmtUsd(d.askingPriceUsd)}</span>
              </div>
              <div className="nd-stat">
                <span className="nd-stat-label">{t("buyer.negotiations.detail.stats.yourBid")}</span>
                <span className="nd-stat-value">{fmtUsd(d.yourBidUsd)}</span>
              </div>
              <div className="nd-stat highlight nd-stat--full">
                <span className="nd-stat-label">{t("buyer.negotiations.detail.stats.supplierCounter")}</span>
                <span className="nd-stat-value">{fmtUsd(d.supplierCounterUsd)}</span>
              </div>
            </div>

            {(d.status === "action_required" || d.status === "final_round" || d.status === "awaiting_supplier") && (
              <>
                <div className="nd-gap-row">
                  <span>{t("buyer.negotiations.detail.gap")}</span>
                  <span className={`nd-gap-value ${gapAbs < 0 ? "negative" : ""}`}>
                    {fmtSignedUsd(gapAbs)} ({gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="nd-gap-bar" style={{ ["--knob" as never]: `${knobPct}%` } as CSSProperties} />
                <div className="nd-gap-labels">
                  <span className="lbl-bid">{t("buyer.negotiations.detail.gapLabel.bid")}</span>
                  <span className="lbl-counter">{t("buyer.negotiations.detail.gapLabel.counter")}</span>
                </div>
              </>
            )}

            {showActions ? (
              <div className="nd-actions">
                <button type="button" className="btn-accept" onClick={handleAccept} disabled={(isReal && (realExpired || realPending || realAccepted)) || offerInactive}>
                  <CheckIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  {t("common.closeDeal")}
                </button>
                {counterAllowed && !offerInactive && (
                  <button type="button" className="btn-counter" onClick={handleCounter} disabled={realExpired}>
                    <ArrowsLeftRightIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                    {t("buyer.negotiations.detail.actions.counterBack")}
                  </button>
                )}
                <button type="button" className="btn-reject" onClick={handleReject} disabled={(isReal && realExpired) || offerInactive}>
                  <XIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  {t("buyer.negotiations.detail.actions.reject")}
                </button>
              </div>
            ) : d.status === "awaiting_supplier" ? (
              <div className="nd-banner muted" style={{ marginTop: 16, marginBottom: 0 }}>
                {t("buyer.negotiations.detail.banner.awaitingSupplier", { round: d.round })}
              </div>
            ) : null}
          </div>

          {/* Supplier info card */}
          <div className="nd-card nd-buyer-info nd-card--joined">
            <dl>
              <dt>{t("buyer.negotiations.detail.supplier.title")}</dt>
              <dd>{d.supplierName}</dd>
              <dt>{t("buyer.negotiations.detail.supplier.avgReplyTime")}</dt>
              <dd>{t("buyer.negotiations.detail.supplier.avgReplyDays", { days: d.avgReplyDays })}</dd>
              <dt>{t("buyer.negotiations.detail.supplier.fclsWeight")}</dt>
              <dd>{d.fclCount} · {fmtWeight(d.totalWeightKg, unit)} {weightLabel(unit)}</dd>
              <dt>{t("buyer.negotiations.detail.supplier.valuePerFcl")}</dt>
              <dd>${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.valuePerFclUsd)}</dd>
              <dt>{t("buyer.negotiations.detail.supplier.movement")}</dt>
              <dd className={d.movementVsAskingUsd < 0 ? "negative" : ""}>
                {fmtSignedUsd(d.movementVsAskingUsd)}
              </dd>
            </dl>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <DealProgressionCard
            rounds={d.rounds}
            currentRound={d.round}
            maxRounds={d.maxRounds}
            perspective="buyer"
            askingTotalUsd={d.products.reduce(
              (s, p) => s + (p.qtyLb / LB_PER_KG) * p.askingUsdKg,
              0,
            )}
          />
          {isReal && rawNeg && (
            <NegotiationActivityTab
              negotiation={rawNeg}
              buyerLabel={rawNeg.buyer?.name ?? "You"}
              supplierLabel={d.supplierName}
            />
          )}
        </div>
      </div>

      {isReal && rawNeg && (
        <NegotiationChat
          negotiationId={rawNeg.id}
          perspective="buyer"
          offerItems={(rawNeg.offer?.items ?? []).map((it: any) => ({
            id: it.id,
            name: it.customer_product?.name ?? "Item",
            price: Number(it.price),
            amount: Number(it.amount),
          }))}
          enabled={isChatEnabled(rawNeg as any)}
          rounds={rawNeg.rounds?.map((r) => ({ id: r.id, round: r.round, created_at: r.created_at })) ?? []}
          agreedItems={rawNeg.agreed_items}
          allowQtyNegotiation={!!rawNeg.offer?.allow_quantity_negotiation}
        />
      )}

      {isReal && rawNeg && (
        <CounterOfferModal
          open={counterOpen}
          onOpenChange={setCounterOpen}
          negotiation={rawNeg}
          perspective="buyer"
          counterpartyLabel={`Supplier: ${d.supplierName}`}
          onSubmitted={() => refetch()}
        />
      )}
      {isReal && rawNeg && (
        <RejectNegotiationModal
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          negotiation={rawNeg}
          onRejected={() => refetch()}
        />
      )}
      {isReal && rawNeg && (
        <CloseDealDialog
          open={closeDealOpen}
          onOpenChange={(o) => !closingDeal && setCloseDealOpen(o)}
          onConfirm={handleConfirmCloseDeal}
          submitting={closingDeal}
        />
      )}
    </>
  );
}
