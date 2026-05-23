import { Fragment, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowsLeftRightIcon,
  CheckIcon,
  XIcon,
  KnifeForkIcon,
  SparkleIcon,
} from "@/components/icons";
import {
  useNegotiation,
  type NegotiationDetail,
  type NegotiationProduct,
} from "@/hooks/useNegotiations";
import { useRealNegotiation, isUuid } from "@/hooks/useRealNegotiation";
import { CounterOfferModal } from "@/components/supplier/CounterOfferModal";
import { acceptNegotiation } from "@/components/supplier/CounterOfferActions";
import { RejectNegotiationModal } from "@/components/negotiation/RejectNegotiationModal";
import { NegotiationChat } from "@/components/negotiation/NegotiationChat";
import { isChatEnabled } from "@/lib/negotiationEngine";
import { ShareWithSupplierCard } from "@/components/supplier/ShareWithSupplierCard";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, weightLabel, LB_PER_KG } from "@/lib/units";
import { NegotiationProgressCard } from "@/components/negotiation/NegotiationProgressCard";
import { ExpirationTimer } from "@/components/negotiation/ExpirationTimer";
import { DealClosedBanner } from "@/components/negotiation/DealClosedBanner";
import {
  isCounterExhausted,
  isFinalDisplayRound,
  isNegotiationExpired,
  getDisplayRound,
  getMaxRaw,
  getAgreedItems,
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

function getPerRoundKg(p: NegotiationProduct, type: "bid" | "counter", round: number): number | undefined {
  const key = `${type}R${round}UsdKg` as keyof NegotiationProduct;
  return p[key] as number | undefined;
}

export default function SupplierNegotiationDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { unit } = useWeightUnit();
  const { data } = useNegotiation(id);
  const isReal = isUuid(id);
  const { data: rawNeg, refetch } = useRealNegotiation(isReal ? id : undefined);
  const [counterOpen, setCounterOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const locale = i18n.language || "en";

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
  // Suppress counter button when no more rounds possible or expired
  const counterAllowed = !isReal || (!realExhausted && !realExpired && !realAccepted);

  // Compute max round index present in products for the price table columns
  const maxRoundShown = Math.min(3, Math.max(...d.rounds.map((r) => r.round), 1));

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
          <span className="chip-value">{d.destinationCountry}</span>
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
        <span className="chip">
          <span className="chip-label">{t("supplier.negotiations.detail.meta.weight")}:</span>
          <span className="chip-value">{fmtWeight(d.totalWeightKg, unit)} {weightLabel(unit)}</span>
        </span>
      </div>

      {isReal && rawNeg && (
        <ShareWithSupplierCard negotiationId={rawNeg.id} buyerLabel={d.buyerName} />
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
      {isReal && realIsFinal && !realAccepted && !realExpired && (
        <div
          className="rounded-md px-3 py-2 mb-3 text-sm font-medium border"
          style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }}
        >
          ⚠️ {t("engine.finalRound.banner", "Final Round — This is the last chance to reach agreement. Unresolved items will be cancelled after this round.")}
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
                <button type="button" className="btn-accept" onClick={handleAccept} disabled={isReal && realExpired}>
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
          {/* Timeline */}
          <div className="nd-card">
            <div className="nd-timeline-head">
              <span className="tl-head-title">
                <SparkleIcon size={14} />
                {t("supplier.negotiations.detail.timeline")}
              </span>
              <span className="tl-head-meta">
                {t("supplier.negotiations.detail.roundOf", { round: d.round, max: d.maxRounds })}
              </span>
            </div>
            <div className="nd-timeline-flow">
              {d.rounds.map((r, i) => {
                const labelKey =
                  r.type === "bid"
                    ? "supplier.negotiations.detail.timelineLabel.bid"
                    : r.isCurrent
                      ? "supplier.negotiations.detail.timelineLabel.counterCurrent"
                      : "supplier.negotiations.detail.timelineLabel.counter";
                const pillClass =
                  r.type === "bid"
                    ? "tl-pill tl-pill--bid"
                    : r.isCurrent
                      ? "tl-pill tl-pill--counter tl-pill--current"
                      : "tl-pill tl-pill--counter";
                return (
                  <Fragment key={`${r.type}-${r.round}-${i}`}>
                    {i > 0 && <span className="tl-sep">→</span>}
                    <span className={pillClass}>
                      <span className="tl-pill-label">{t(labelKey, { n: r.round })}</span>
                      <span>{fmtUsd(r.totalUsd, 2)}</span>
                    </span>
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* Price details */}
          <div className="nd-card">
            <div className="nd-card-head">
              <strong>{t("supplier.negotiations.detail.priceDetails")}</strong>
            </div>
            <div className="nd-price-scroll-wrap" style={{ overflowX: "auto" }}>
              <table className="nd-price-table">
                <thead>
                  <tr>
                    <th>{t("supplier.negotiations.detail.col.product")}</th>
                    <th>{t("supplier.negotiations.detail.col.qty", { unit: weightLabel(unit), defaultValue: "Qty ({{unit}})" })}</th>
                    <th>{t("supplier.negotiations.detail.col.asking")}</th>
                    {Array.from({ length: maxRoundShown }, (_, i) => (
                      <Fragment key={`h-${i}`}>
                      <th className="col-bid">{t("supplier.negotiations.detail.col.bidR", { n: i + 1 })}</th>
                      <th className="col-counter">{t("supplier.negotiations.detail.col.counterR", { n: i + 1 })}</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.products.map((p) => {
                    const qtyKg = p.qtyLb / LB_PER_KG;
                    const agreed = agreedByName.get(p.name);
                    const rowStyle = agreed
                      ? { background: "rgba(34,197,94,0.06)" }
                      : undefined;
                    return (
                      <tr key={p.name} style={rowStyle}>
                        <td>
                          <span className="product-name">
                            {agreed && <span aria-hidden style={{ marginRight: 4 }}>🔒</span>}
                            {p.name}
                          </span>
                          <span className="product-pack">{p.pack}</span>
                          {agreed && (
                            <span
                              className="inline-block ml-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ background: "rgba(34,197,94,0.15)", color: "#15803d" }}
                            >
                              {t("negotiation.agreedBadge", {
                                defaultValue: "Agreed at ${{price}}/{{unit}}",
                                price: fmtPrice(agreed.price, unit),
                                unit: weightLabel(unit),
                              })}
                            </span>
                          )}
                        </td>
                        <td>{fmtWeight(qtyKg, unit)}</td>
                        <td>${fmtPrice(p.askingUsdKg, unit)}</td>
                        {Array.from({ length: maxRoundShown }, (_, i) => {
                          const round = i + 1;
                          const bidV = getPerRoundKg(p, "bid", round);
                          const cntV = getPerRoundKg(p, "counter", round);
                          const isCurrentCounter = round === maxRoundShown;
                          const showAgreedInLast = agreed && isCurrentCounter;
                          return (
                            <Fragment key={`v-${i}`}>
                              <td className="col-bid">{bidV != null ? `$${fmtPrice(bidV, unit)}` : "—"}</td>
                              <td
                                className={`col-counter${isCurrentCounter ? " col-counter--current" : ""}`}
                                style={showAgreedInLast ? { color: "#15803d", fontWeight: 600 } : undefined}
                              >
                                {showAgreedInLast
                                  ? `$${fmtPrice(agreed!.price, unit)} 🔒`
                                  : cntV != null
                                    ? `$${fmtPrice(cntV, unit)}`
                                    : "—"}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
        />
      )}

      {isReal && rawNeg && (
        <CounterOfferModal
          open={counterOpen}
          onOpenChange={setCounterOpen}
          negotiation={rawNeg}
          perspective="supplier"
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