import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeftIcon, EditIcon } from "@/components/icons";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, priceLabel, weightLabel } from "@/lib/units";
import {
  useBuyerRequest,
  type BuyerRequestStatus,
  type ReceivedOffer,
} from "@/hooks/useBuyerRequests";

const STATUS_CHIP: Record<BuyerRequestStatus, string> = {
  draft: "req-status-chip is-draft",
  active: "req-status-chip is-active",
  closed_won: "req-status-chip is-won",
  closed_no_winner: "req-status-chip is-nowin",
  expired: "req-status-chip is-expired",
};

function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE").format(v);
}
function fmtUsd(v: number, frac = 2) {
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: frac, maximumFractionDigits: frac }).format(v)}`;
}
function fmtDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(iso));
}
function fmtMonth(ym: string, locale: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })
    .format(new Date(y, m - 1, 1));
}

export default function BuyerRequestDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { data } = useBuyerRequest(id);
  const locale = i18n.language || "en";

  if (!data) {
    return (
      <>
        <Link to="/buyer/requests" className="nd-back">
          <ArrowLeftIcon size={16} />
          {t("buyer.requests.detail.back")}
        </Link>
        <div className="detail-empty"><p>{t("buyer.requests.empty")}</p></div>
      </>
    );
  }

  const r = data;
  const isActive = r.status === "active";
  const isDraft = r.status === "draft";
  const winner = r.offers.find((o) => o.status === "accepted");
  const bestPrice = r.offers.length > 0
    ? Math.min(...r.offers.map((o) => o.pricePerKgUsd))
    : null;

  const onEdit = () => toast(t("buyer.requests.toast.edit"));
  const onPublish = () => toast(t("buyer.requests.toast.publish"));
  const onClose = () => toast(t("buyer.requests.toast.closeRequest"));
  const onAccept = (o: ReceivedOffer) => {
    console.log("accept offer", o.id);
    toast.success(t("buyer.requests.toast.acceptOffer", { name: o.supplierName }));
  };
  const onDecline = (o: ReceivedOffer) => {
    console.log("decline offer", o.id);
    toast(t("buyer.requests.toast.declineOffer", { name: o.supplierName }));
  };
  const onView = (o: ReceivedOffer) => {
    console.log("view offer", o.id);
    toast(t("buyer.requests.toast.viewOffer", { defaultValue: "Offer details coming soon" }));
  };

  return (
    <>
      <Link to="/buyer/requests" className="nd-back">
        <ArrowLeftIcon size={16} />
        {t("buyer.requests.detail.back")}
      </Link>

      {/* Header */}
      <div className="nd-header">
        <div className="nd-h-text">
          <h1>{r.title}</h1>
          <div className="nd-sub">
            <span className="mono">{r.id}</span> · {t("buyer.requests.detail.section.requestStatus")}{" "}
            <span className={STATUS_CHIP[r.status]} style={{ marginLeft: 4 }}>
              {t(`buyer.requests.status.${r.status}`)}
            </span>
          </div>
        </div>
        <div className="nd-h-right">
          <span className="req-species-chip">{r.species}</span>
          <button type="button" className="btn-tb" onClick={onEdit}>
            <EditIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {t("buyer.requests.detail.edit")}
          </button>
          {isDraft && (
            <button type="button" className="btn-tb is-primary" onClick={onPublish}>
              {t("buyer.requests.detail.publish")}
            </button>
          )}
          {isActive && (
            <button type="button" className="btn-tb" onClick={onClose}>
              {t("buyer.requests.detail.close")}
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {r.status === "draft" && (
        <div className="req-banner draft">{t("buyer.requests.detail.banner.draft")}</div>
      )}
      {r.status === "active" && (
        <div className="req-banner active">
          {t("buyer.requests.detail.banner.active", {
            deadline: r.deadlineAt ? fmtDate(r.deadlineAt, locale) : "—",
          })}
        </div>
      )}
      {r.status === "closed_won" && winner && (
        <div className="req-banner won">
          {t("buyer.requests.detail.banner.closedWon", { supplier: winner.supplierName })}
        </div>
      )}
      {r.status === "closed_no_winner" && (
        <div className="req-banner nowin">{t("buyer.requests.detail.banner.closedNoWinner")}</div>
      )}
      {r.status === "expired" && (
        <div className="req-banner expired">{t("buyer.requests.detail.banner.expired")}</div>
      )}

      {/* Meta chips */}
      <div className="nd-meta-chips">
        <span className="chip">
          <span className="chip-label">{t("buyer.requests.detail.meta.target")}:</span>
          <span className="chip-value">${fmtPrice(r.targetPricePerKgUsd, unit)}/{weightLabel(unit)}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.requests.detail.meta.volume")}:</span>
          <span className="chip-value">{fmtWeight(r.targetVolumeKg, unit)} {weightLabel(unit)}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.requests.detail.meta.fcl")}:</span>
          <span className="chip-value">{r.fclCount}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.requests.detail.meta.shipment")}:</span>
          <span className="chip-value">{fmtMonth(r.shipmentMonth, locale)}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.requests.detail.meta.incoterm")}:</span>
          <span className="chip-value">{r.incotermPreferred}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.requests.detail.meta.payment")}:</span>
          <span className="chip-value">{r.paymentTermsPreferred}</span>
        </span>
        <span className="chip">
          <span className="chip-label">{t("buyer.requests.col.destination")}:</span>
          <span className="chip-value">{r.destinationPort} · {r.destinationCountry}</span>
        </span>
      </div>

      <div className="req-detail-grid">
        {/* LEFT */}
        <div>
          {/* Requirements */}
          <div className="nd-card">
            <div className="nd-card-head">
              <strong>{t("buyer.requests.detail.section.requirements")}</strong>
            </div>
            <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.5 }}>
              {r.description}
            </p>
            <div className="req-cuts">
              {r.cuts.map((c) => (
                <span key={c} className="chip">{c}</span>
              ))}
            </div>
          </div>

          {/* Offers received */}
          <div className="nd-card">
            <div className="nd-card-head">
              <strong>
                {t("buyer.requests.detail.section.offersReceived")} ({r.offers.length})
              </strong>
            </div>
            {r.offers.length === 0 ? (
              <p style={{ color: "var(--fg-muted)", fontSize: "var(--fs-sm)", margin: 0 }}>
                {t("buyer.requests.detail.noOffers", { defaultValue: "No offers received yet." })}
              </p>
            ) : (
              <div className="req-offer-list">
                {r.offers.map((o) => {
                  const isWinner = o.status === "accepted" && r.status === "closed_won";
                  return (
                    <div
                      key={o.id}
                      className={`req-offer-card ${isWinner ? "req-winner" : ""}`.trim()}
                    >
                      <div className="supplier">
                        <span className="avatar">{o.supplierInitials}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="name">
                            {o.supplierName}
                            {isWinner && (
                              <span className="req-winner-badge">
                                {t("buyer.requests.detail.offer.winnerBadge")}
                              </span>
                            )}
                          </div>
                          <div className="sub">
                            {o.supplierCountryCode} · {o.originPort} · {o.incoterm}
                          </div>
                        </div>
                      </div>
                      <div className="figures">
                        <div className="fig">
                          <span className="lbl">{t("buyer.requests.detail.offer.total", { defaultValue: "Total" })}</span>
                          <span className="val">{fmtUsd(o.totalUsd, 0)}</span>
                        </div>
                        <div className="fig">
                          <span className="lbl">{t("buyer.requests.detail.offer.perKg")}</span>
                          <span className="val">${o.pricePerKgUsd.toFixed(2)}</span>
                        </div>
                        <div className="fig">
                          <span className="lbl">{t("buyer.requests.detail.offer.leadTime")}</span>
                          <span className="val">{o.leadTimeDays}d</span>
                        </div>
                        <div className="fig">
                          <span className="lbl">{t("buyer.requests.detail.offer.origin")}</span>
                          <span className="val">{o.originPort}</span>
                        </div>
                      </div>
                      <div className="actions">
                        <button type="button" className="view" onClick={() => onView(o)}>
                          {t("buyer.requests.detail.offer.viewBtn")}
                        </button>
                        {isActive && (
                          <>
                            <button type="button" className="accept" onClick={() => onAccept(o)}>
                              {t("buyer.requests.detail.offer.acceptBtn")}
                            </button>
                            <button type="button" className="decline" onClick={() => onDecline(o)}>
                              {t("buyer.requests.detail.offer.declineBtn")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <div className="nd-card">
            <div className="nd-card-head">
              <strong>{t("buyer.requests.detail.section.requestStatus")}</strong>
            </div>
            <div className="req-status-timeline">
              <div className="step done">
                <span className="dot" />
                <div>
                  <span className="label">{t("buyer.requests.detail.timeline.created")}</span>
                  <span className="date">{fmtDate(r.createdAt, locale)}</span>
                </div>
              </div>
              {r.publishedAt && (
                <div className="step done">
                  <span className="dot" />
                  <div>
                    <span className="label">{t("buyer.requests.detail.timeline.published")}</span>
                    <span className="date">{fmtDate(r.publishedAt, locale)}</span>
                  </div>
                </div>
              )}
              {r.offers.length > 0 && (
                <div className="step done">
                  <span className="dot" />
                  <div>
                    <span className="label">{t("buyer.requests.detail.timeline.firstOffer")}</span>
                    <span className="date">{fmtDate(r.offers[0].receivedAt, locale)}</span>
                  </div>
                </div>
              )}
              {(r.status === "closed_won" || r.status === "closed_no_winner" || r.status === "expired") && (
                <div className="step done">
                  <span className="dot" />
                  <div>
                    <span className="label">{t("buyer.requests.detail.timeline.closed")}</span>
                    <span className="date">{fmtDate(r.updatedAt, locale)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="nd-card">
            <div className="nd-card-head">
              <strong>{t("buyer.requests.detail.section.quickStats")}</strong>
            </div>
            <div className="req-summary-stat">
              <span className="lbl">{t("buyer.requests.detail.stats.offersReceived")}</span>
              <span className="val">{r.offers.length}</span>
            </div>
            <div className="req-summary-stat">
              <span className="lbl">{t("buyer.requests.detail.stats.bestPrice")}</span>
              <span className="val">{bestPrice != null ? `$${fmtPrice(bestPrice, unit)}/${weightLabel(unit)}` : "—"}</span>
            </div>
            <div className="req-summary-stat">
              <span className="lbl">{t("buyer.requests.detail.stats.deadline")}</span>
              <span className="val">{r.deadlineAt ? fmtDate(r.deadlineAt, locale) : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}