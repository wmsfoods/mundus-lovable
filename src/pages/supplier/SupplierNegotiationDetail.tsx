import { Fragment, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, CheckIcon, XIcon, MessageIcon } from "@/components/icons";
import { useNegotiationDetail } from "@/hooks/useNegotiations";

function fmtUsd(v: number, fractionDigits = 2) {
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(v)}`;
}
function fmtLb(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
}

export default function SupplierNegotiationDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useNegotiationDetail(id);
  const [actionLog, setActionLog] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="detail-empty">
        <h1>{t("supplier.negotiationDetail.notFound")}</h1>
        <button
          type="button"
          className="btn-tb is-primary"
          onClick={() => navigate("/supplier/negotiations")}
        >
          {t("supplier.negotiationDetail.backToList")}
        </button>
      </div>
    );
  }

  const gapAbs = data.yourCounter - data.buyerBid;
  const gapPct = (gapAbs / data.buyerBid) * 100;
  const markerPos = gapAbs > 0 ? 100 : 0;

  return (
    <>
      <button
        type="button"
        className="nego-back-link"
        onClick={() => navigate("/supplier/negotiations")}
      >
        <ArrowLeftIcon size={16} />
        {t("supplier.negotiationDetail.backToList")}
      </button>

      <div className="nego-detail-header">
        <span className="product-icon" aria-hidden="true">
          <MessageIcon size={22} />
        </span>
        <div className="head-info">
          <h1>{data.parentTitle}</h1>
          <span className="head-sub">
            ID {data.id.replace("b-", "000")} · {data.oppWmsRef} · {data.buyerName}
          </span>
        </div>
        <div className="head-actions">
          {data.expiresIn && (
            <span className="nego-timer" style={{ fontSize: "var(--fs-sm)" }}>
              ⏱ {data.expiresIn}
            </span>
          )}
          {data.status === "action_required" && (
            <span className="pill pill-action-required">
              {t("supplier.negotiations.status.action_required")}
            </span>
          )}
        </div>
      </div>

      <div className="nego-meta-chips">
        <span className="nego-meta-chip">
          <span className="lbl">{t("supplier.negotiationDetail.meta.incoterm")}</span>
          <span className="val">{data.incoterm}</span>
        </span>
        <span className="nego-meta-chip">
          <span className="lbl">{t("supplier.negotiationDetail.meta.destination")}</span>
          <span className="val">{data.destinationCountry}</span>
        </span>
        <span className="nego-meta-chip">
          <span className="lbl">{t("supplier.negotiationDetail.meta.port")}</span>
          <span className="val">{data.destinationPort}</span>
        </span>
        <span className="nego-meta-chip">
          <span className="lbl">{t("supplier.negotiationDetail.meta.payment")}</span>
          <span className="val">{data.paymentTerm}</span>
        </span>
        <span className="nego-meta-chip">
          <span className="lbl">{t("supplier.negotiationDetail.meta.fcls")}</span>
          <span className="val">{data.fcls}</span>
        </span>
        <span className="nego-meta-chip">
          <span className="lbl">{t("supplier.negotiationDetail.meta.weight")}</span>
          <span className="val">{new Intl.NumberFormat("de-DE").format(data.weightKg)} kg</span>
        </span>
      </div>

      <div className="nego-detail-grid">
        <div>
          <div className="nego-card">
            <div className="nego-round-head">
              <span className="nego-round-pill">
                {t("supplier.negotiationDetail.roundOf", { current: data.round, total: data.maxRounds })}
              </span>
              <div style={{ textAlign: "right" }}>
                <div className="updated">{t("supplier.negotiationDetail.updated", { date: data.updatedAt })}</div>
                <div className="updated">{t("supplier.negotiationDetail.roundsCount", { current: data.round, total: data.maxRounds })}</div>
              </div>
            </div>
            <div className="nego-round-body">
              <p>{t("supplier.negotiationDetail.bidMessage", { buyer: data.buyerName, round: data.round })}</p>

              <div className="nego-big-numbers">
                <div className="nego-big-number">
                  <span className="lbl">{t("supplier.negotiationDetail.asking")}</span>
                  <span className="val">{fmtUsd(data.askingPrice)}</span>
                </div>
                <div className="nego-big-number">
                  <span className="lbl">{t("supplier.negotiationDetail.buyerBid")}</span>
                  <span className="val">{fmtUsd(data.buyerBid)}</span>
                </div>
                <div className="nego-big-number highlight">
                  <span className="lbl">{t("supplier.negotiationDetail.yourCounter")}</span>
                  <span className="val">{fmtUsd(data.yourCounter)}</span>
                </div>
              </div>

              <div className="nego-gap">
                <span>{t("supplier.negotiationDetail.gap")}</span>
                <span className="val">
                  {gapAbs >= 0 ? "+" : ""}{fmtUsd(gapAbs)} ({gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}%)
                </span>
              </div>
              <div className="nego-gap-bar">
                <span className="lbl-l">{t("supplier.negotiationDetail.bid").toUpperCase()}</span>
                <span className="lbl-r">{t("supplier.negotiationDetail.counter").toUpperCase()}</span>
                <span className="marker" style={{ left: `${markerPos}%` }} />
              </div>

              <div className="nego-actions">
                <button type="button" className="btn-counter" onClick={() => setActionLog("send-counter")}>
                  ↔ {t("supplier.negotiationDetail.actions.sendCounter")}
                </button>
                <button type="button" className="btn-accept" onClick={() => setActionLog("accept")}>
                  <CheckIcon size={14} /> {t("supplier.negotiationDetail.actions.acceptBid")}
                </button>
                <button type="button" className="btn-reject" onClick={() => setActionLog("reject")}>
                  <XIcon size={14} /> {t("supplier.negotiationDetail.actions.reject")}
                </button>
              </div>

              {actionLog && (
                <p style={{ marginTop: 12, fontSize: "var(--fs-xs)", color: "var(--fg-muted)" }}>
                  (Mock action: {actionLog})
                </p>
              )}
            </div>
          </div>

          <div className="nego-card nego-buyer-info">
            <h3>{t("supplier.negotiationDetail.buyerInfo")}</h3>
            <div className="row">
              <span className="k">{t("supplier.negotiationDetail.buyer")}</span>
              <span className="v">{data.buyerName}</span>
            </div>
            <div className="row">
              <span className="k">{t("supplier.negotiationDetail.avgReply")}</span>
              <span className="v">{data.avgReplyTime}</span>
            </div>
            <div className="row">
              <span className="k">{t("supplier.negotiationDetail.fclsWeight")}</span>
              <span className="v">{data.fcls} · {new Intl.NumberFormat("de-DE").format(data.weightKg)} kg</span>
            </div>
            <div className="row">
              <span className="k">{t("supplier.negotiationDetail.valuePerFcl")}</span>
              <span className="v">{fmtUsd(data.valuePerFcl)}</span>
            </div>
            <div className="row movement">
              <span className="k">{t("supplier.negotiationDetail.movement")}</span>
              <span className={`v ${data.movement < 0 ? "negative" : ""}`}>
                {data.movement >= 0 ? "+" : ""}{fmtUsd(data.movement)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="nego-card">
            <h3>{t("supplier.negotiationDetail.timeline")}</h3>
            <div className="nego-timeline">
              {data.timeline.map((e, i) => (
                <Fragment key={`${e.round}-${e.type}-${i}`}>
                  <div className={`nego-timeline-card ${e.type} ${e.isCurrent ? "is-current" : ""}`.trim()}>
                    <span className="lbl">
                      {e.type === "bid" ? t("supplier.negotiationDetail.bid") : t("supplier.negotiationDetail.counter")} {e.round}
                    </span>
                    <span className="val">{fmtUsd(e.amount)}</span>
                    {e.isCurrent && (
                      <span className="badge-current">{t("supplier.negotiationDetail.current")}</span>
                    )}
                  </div>
                  {i < data.timeline.length - 1 && <span className="arrow" aria-hidden="true">→</span>}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="nego-card">
            <h3>{t("supplier.negotiationDetail.priceDetails")}</h3>
            <div style={{ overflowX: "auto" }}>
              <table className="nego-price-table">
                <thead>
                  <tr>
                    <th>{t("supplier.negotiationDetail.col.product")}</th>
                    <th>{t("supplier.negotiationDetail.col.qtyLb")}</th>
                    <th>{t("supplier.negotiationDetail.col.asking")}</th>
                    {Array.from({ length: data.round }, (_, r) => (
                      <Fragment key={`h-${r}`}>
                        <th>{t("supplier.negotiationDetail.col.bidR", { n: r + 1 })}</th>
                        <th>{t("supplier.negotiationDetail.col.counterR", { n: r + 1 })}</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cuts.map((c) => (
                    <tr key={c.product}>
                      <td>
                        <div className="product-cell">
                          <span className="name">{c.product}</span>
                          <span className="pack">{c.pack}</span>
                        </div>
                      </td>
                      <td className="num">{fmtLb(c.quantityLb)}</td>
                      <td className="num">{fmtUsd(c.asking, 2)}</td>
                      {Array.from({ length: data.round }, (_, r) => {
                        const rd = c.perRound.find((p) => p.round === r + 1);
                        return (
                          <Fragment key={`bc-${r}`}>
                            <td className="num bid">{rd?.bid != null ? fmtUsd(rd.bid, 2) : "—"}</td>
                            <td className="num counter">{rd?.counter != null ? fmtUsd(rd.counter, 2) : "—"}</td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}