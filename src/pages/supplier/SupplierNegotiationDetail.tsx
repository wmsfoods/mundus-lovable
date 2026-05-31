import { useEffect, useState, type CSSProperties } from "react";
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
  useNegotiation,
  type NegotiationDetail,
} from "@/hooks/useNegotiations";
import { useRealNegotiation, isUuid } from "@/hooks/useRealNegotiation";
import { CounterOfferModal } from "@/components/supplier/CounterOfferModal";
import { acceptNegotiation } from "@/components/supplier/CounterOfferActions";
import { RejectNegotiationModal } from "@/components/negotiation/RejectNegotiationModal";
import { NegotiationChat } from "@/components/negotiation/NegotiationChat";
import { isChatEnabled } from "@/lib/negotiationEngine";
import { ShareWithSupplierCard } from "@/components/supplier/ShareWithSupplierCard";
import { OtherBidsPanel } from "@/components/negotiation/OtherBidsPanel";
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
  getAgreedItems,
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

export default function SupplierNegotiationDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { unit } = useWeightUnit();
  const [activeId, setActiveId] = useState<string>(id);
  // If the route param changes via real navigation (e.g. admin opens a
  // different negotiation from the list), follow it. Inline switches use
  // history.replaceState so :id stays the same and this effect is a no-op.
  useEffect(() => {
    if (id) setActiveId(id);
  }, [id]);
  const { data } = useNegotiation(activeId);
  const isReal = isUuid(activeId);
  const { data: rawNeg, refetch } = useRealNegotiation(isReal ? activeId : undefined);
  const [counterOpen, setCounterOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const locale = i18n.language || "en";
  useStackHeader({ title: data?.parentTitle ?? "Negotiation" });

  const switchBuyer = (negId: string) => {
    if (!negId || negId === activeId) return;
    setActiveId(negId);
    // update URL in place without remounting the page
    try {
      const newPath = window.location.pathname.replace(/\/[^/]+$/, `/${negId}`);
      window.history.replaceState(window.history.state, "", newPath);
    } catch {
      /* noop */
    }
  };

  if (!data) {
    return (
      <>
        <Link to="/supplier/negotiations" className="nd-back">
          <ArrowLeftIcon size={16} />
          {t("supplier.negotiations.detail.back")}
        </Link>
        <div className="detail-empty">
          <p>{t("supplier.negotiations.empty")}</p>
        </div>
      </>
    );
  }

  const d: NegotiationDetail = data;
  const gapAbs = d.yourCounterUsd - d.latestBidUsd;
  const gapPct = (gapAbs / d.latestBidUsd) * 100;
  // Knob position: map gap as % of asking range. Clamp 0-100.
  const knobPct = Math.max(0, Math.min(100, 50 + gapPct * 10));

  const handleCounter = () => {
    if (isReal && rawNeg) {
      setCounterOpen(true);
    } else {
      toast(t("supplier.negotiations.detail.toast.counterSent"));
    }
  };
  const handleAccept = async () => {
    if (isReal && rawNeg) {
      const ok = await acceptNegotiation(rawNeg, "supplier");
      if (ok) refetch();
    } else {
      toast.success(t("supplier.negotiations.detail.toast.bidAccepted"));
    }
  };
  const handleReject = () => {
    if (isReal && rawNeg) {
      setRejectOpen(true);
    } else {
      toast(t("supplier.negotiations.detail.toast.bidRejected"));
    }
  };

  // Map agreed items by product name (mock products lack offer_item_id; match
  // via the real negotiation's offer items when available).
  const agreedByName = (() => {
    const map = new Map<string, { price: number; round: number }>();
    if (!rawNeg) return map;
    const items = rawNeg.offer?.items ?? [];
    const byId = new Map(items.map((it) => [it.id, it.customer_product?.name ?? ""]));
    for (const a of getAgreedItems(rawNeg)) {
      const name = byId.get(a.offer_item_id);
      if (name) map.set(name, { price: a.price_per_kg, round: a.agreed_round });
    }
    return map;
  })();

  const showActions = d.status === "action_required" || d.status === "final_round";
  // Engine state (real negotiations only)
  const realDisplayRound = rawNeg ? getDisplayRound(getMaxRaw(rawNeg)) : 0;
  const realIsFinal = !!rawNeg && isFinalDisplayRound(realDisplayRound);
  const realExhausted = !!rawNeg && isCounterExhausted(rawNeg);
  const realExpired = !!rawNeg && isNegotiationExpired(rawNeg);
  const realAccepted = !!rawNeg && rawNeg.status === "bid_accepted";
  const realPending = !!rawNeg && (rawNeg as any).status === "pending_confirmation";
  const acceptedBy = (rawNeg as any)?.accepted_by as "buyer" | "supplier" | null;
  const canConfirmAsCounterparty = realPending && acceptedBy === "buyer";
  // Suppress counter button when no more rounds possible or expired
  const counterAllowed =
    !isReal || (!realExhausted && !realExpired && !realAccepted && !realPending);

  // Compute max round index present in products for the price table columns
  const maxRoundShown = Math.min(
    MAX_DISPLAY_ROUNDS,
    Math.max(...d.rounds.map((r) => r.round), 1),
  );

  return (
    <>
      <Link to="/supplier/negotiations" className="nd-back">
        <ArrowLeftIcon size={16} />
        {t("supplier.negotiations.detail.back")}
      </Link>

      {/* Header */}
      <div className="nd-header">
        <span className="nd-avatar" aria-hidden="true">
          <KnifeForkIcon size={20} />
        </span>
        <div className="nd-h-text">
          <h1>{d.parentTitle}</h1>
          <div className="nd-sub">
            ID <span className="mono">{d.buyerInternalId}</span> · {d.oppWmsRef} · {d.buyerName}
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
              {t("supplier.negotiations.detail.banner.actionRequired")}
            </span>
          )}
        </div>
      </div>

      {/* Meta chips */}
      <div className="nd-meta-chips">
        <span className="chip">
          <span className="chip-label">{t("supplier.negotiations.detail.meta.incoterm")}:</span>
          <span className="chip-value">{d.incoterm}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("supplier.negotiations.detail.meta.destination")}:</span>
          <span className="chip-value">{countryFlag(d.destinationCountry)} {d.destinationCountry}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("supplier.negotiations.detail.meta.port")}:</span>
          <span className="chip-value">{d.destinationPort}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("supplier.negotiations.detail.meta.payment")}:</span>
          <span className="chip-value">{d.paymentTerms}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("supplier.negotiations.detail.meta.fcls")}:</span>
          <span className="chip-value">{d.fclCount}</span>
        </span>
        <OfferAvailabilityChip
          offerId={rawNeg?.offer?.id ?? rawNeg?.offer_id}
          totalFcl={rawNeg?.offer?.total_fcl}
          thisNegotiationFcl={d.fclCount}
        />
        <span className="chip">
          <span className="chip-label">{t("supplier.negotiations.detail.meta.weight")}:</span>
          <span className="chip-value">{fmtWeight(d.totalWeightKg, unit)} {weightLabel(unit)}</span>
        </span>
      </div>

      {isReal && rawNeg && (
        <ShareWithSupplierCard negotiationId={rawNeg.id} buyerLabel={d.buyerName} />
      )}

      {isReal && rawNeg && (
        <OtherBidsPanel
          currentNegotiationId={rawNeg.id}
          offerId={rawNeg.offer_id}
          currentBuyerTotal={d.latestBidUsd}
          currentBuyerName={d.buyerName}
          currentRound={d.round}
          currentStatus={rawNeg.status}
          currentDestinationCountry={d.destinationCountry}
          onSelect={switchBuyer}
        />
      )}

      {isReal && rawNeg && <NegotiationProgressCard negotiation={rawNeg} />}
      {isReal && rawNeg?.buyer_message && (
        <div
          className="rounded-md border px-3 py-2 mb-3 text-sm"
          style={{ background: "#f5f3ff", borderColor: "#ddd6fe", color: "#4c1d95" }}
        >
          <div className="text-xs font-semibold uppercase mb-1 opacity-70">
            {t("supplier.negotiations.detail.noteFromBuyer", "Note from buyer")}
          </div>
          <div className="whitespace-pre-wrap">{rawNeg.buyer_message}</div>
        </div>
      )}
      {isReal && rawNeg && realAccepted && (
        <DealClosedBanner negotiation={rawNeg} perspective="supplier" />
      )}
      {isReal && rawNeg && realPending && (
        <PendingConfirmationBanner
          negotiation={rawNeg}
          perspective="supplier"
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
            This is the last round of negotiation on this offer. You can send a counter to the buyer for final evaluation, accept the buyer's current bid, reject, or send a message.
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

      {/* Full-width price history — placed above the negotiation grid */}
      <PriceHistoryTable
        products={d.products}
        maxRoundShown={maxRoundShown}
        agreedByName={agreedByName}
      />

      <div className="nd-grid">

        {/* LEFT */}
        <div>
          {/* Round / bid card */}
          <div className="nd-card">
            <div className="nd-card-head">
              <span className="nd-round-badge">
                {t("supplier.negotiations.detail.roundOf", { round: d.round, max: d.maxRounds })}
              </span>
              <span className="nd-updated">
                {t("supplier.negotiations.detail.updated", { date: fmtDate(d.updatedAt, locale) })}
              </span>
            </div>

            {d.status === "final_round" && (
              <div className="nd-banner final-round">
                {t("supplier.negotiations.detail.banner.finalRound")}
              </div>
            )}
            {d.status === "accepted" && (
              <div className="nd-banner success">
                {t("supplier.negotiations.detail.banner.accepted", { price: fmtUsd(d.yourCounterUsd) })}
              </div>
            )}
            {d.status === "rejected" && (
              <div className="nd-banner danger">
                {t("supplier.negotiations.detail.banner.rejected")}
              </div>
            )}
            {d.status === "expired" && (
              <div className="nd-banner muted">
                {t("supplier.negotiations.detail.banner.expired")}
              </div>
            )}

            <p className="nd-summary">
              {t("supplier.negotiations.detail.summary", { buyer: d.buyerName, round: d.round })}
            </p>

            <div className="nd-stats">
              <div className="nd-stat">
                <span className="nd-stat-label">{t("supplier.negotiations.detail.stats.asking")}</span>
                <span className="nd-stat-value">{fmtUsd(d.askingPriceUsd)}</span>
              </div>
              <div className="nd-stat">
                <span className="nd-stat-label">{t("supplier.negotiations.detail.stats.buyerBid")}</span>
                <span className="nd-stat-value">{fmtUsd(d.latestBidUsd)}</span>
              </div>
              <div className="nd-stat highlight nd-stat--full">
                <span className="nd-stat-label">{t("supplier.negotiations.detail.stats.yourCounter")}</span>
                <span className="nd-stat-value">{fmtUsd(d.yourCounterUsd)}</span>
              </div>
            </div>

            {(d.status === "action_required" || d.status === "final_round" || d.status === "awaiting_buyer") && (
              <>
                <div className="nd-gap-row">
                  <span>{t("supplier.negotiations.detail.gap")}</span>
                  <span className={`nd-gap-value ${gapAbs < 0 ? "negative" : ""}`}>
                    {fmtSignedUsd(gapAbs)} ({gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="nd-gap-bar" style={{ ["--knob" as never]: `${knobPct}%` } as CSSProperties} />
                <div className="nd-gap-labels">
                  <span className="lbl-bid">{t("supplier.negotiations.detail.gapLabel.bid")}</span>
                  <span className="lbl-counter">{t("supplier.negotiations.detail.gapLabel.counter")}</span>
                </div>
              </>
            )}

            {showActions ? (
              <div className="nd-actions">
                {counterAllowed && (
                  <button type="button" className="btn-counter" onClick={handleCounter} disabled={realExpired}>
                    <ArrowsLeftRightIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                    {t("supplier.negotiations.detail.actions.sendCounter")}
                  </button>
                )}
                <button type="button" className="btn-accept" onClick={handleAccept} disabled={isReal && (realExpired || realPending || realAccepted)}>
                  <CheckIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  {t("supplier.negotiations.detail.actions.acceptBid")}
                </button>
                <button type="button" className="btn-reject" onClick={handleReject} disabled={isReal && realExpired}>
                  <XIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                  {t("supplier.negotiations.detail.actions.reject")}
                </button>
              </div>
            ) : d.status === "awaiting_buyer" ? (
              <div className="nd-banner muted" style={{ marginTop: 16, marginBottom: 0 }}>
                {t("supplier.negotiations.detail.banner.awaitingBuyer", { round: d.round })}
              </div>
            ) : null}
          </div>

          {/* Buyer info card */}
          <div className="nd-card nd-buyer-info nd-card--joined">
            <dl>
              <dt>{t("supplier.negotiations.detail.buyer.title")}</dt>
              <dd>{d.buyerName}</dd>
              <dt>{t("supplier.negotiations.detail.buyer.avgReplyTime")}</dt>
              <dd>{t("supplier.negotiations.detail.buyer.avgReplyDays", { days: d.avgReplyDays })}</dd>
              <dt>{t("supplier.negotiations.detail.buyer.fclsWeight")}</dt>
              <dd>{d.fclCount} · {fmtWeight(d.totalWeightKg, unit)} {weightLabel(unit)}</dd>
              <dt>{t("supplier.negotiations.detail.buyer.valuePerFcl")}</dt>
              <dd>${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.valuePerFclUsd)}</dd>
              <dt>{t("supplier.negotiations.detail.buyer.movement")}</dt>
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
            perspective="supplier"
            askingTotalUsd={d.products.reduce(
              (s, p) => s + (p.qtyLb / LB_PER_KG) * p.askingUsdKg,
              0,
            )}
          />
          {isReal && rawNeg && (
            <NegotiationActivityTab
              negotiation={rawNeg}
              buyerLabel={d.buyerName}
              supplierLabel={rawNeg.offer?.supplier_name ?? "Supplier"}
            />
          )}
        </div>
      </div>

      {isReal && rawNeg && (
        <NegotiationChat
          negotiationId={rawNeg.id}
          perspective="supplier"
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
          perspective="supplier"
          counterpartyLabel={`Buyer: ${d.buyerName}`}
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
    </>
  );
}