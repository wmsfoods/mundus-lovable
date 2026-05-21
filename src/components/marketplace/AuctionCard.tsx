import { useTranslation } from "react-i18next";
import { FlagSVG } from "@/components/icons";
import { Gavel } from "lucide-react";
import { AuctionCountdown } from "./AuctionCountdown";
import { auctionClosesAt, auctionOpenedAt, type MockAuction } from "@/data/mockAuctions";

type Props = {
  auction: MockAuction;
  onPlaceBid?: () => void;
};

function StatusBadge({ status, t }: { status: MockAuction["status"]; t: (k: string) => string }) {
  if (status === "open") {
    return (
      <span className="auct-status auct-status--live">
        <span className="auct-pulse" aria-hidden />
        {t("buyer.auctions.statusBadge.live")}
      </span>
    );
  }
  if (status === "awarded") {
    return <span className="auct-status auct-status--awarded">● {t("buyer.auctions.statusBadge.awarded")}</span>;
  }
  if (status === "closed") {
    return <span className="auct-status auct-status--closed">● {t("buyer.auctions.statusBadge.closed")}</span>;
  }
  if (status === "scheduled") {
    return <span className="auct-status auct-status--scheduled">● {t("buyer.auctions.statusBadge.scheduled")}</span>;
  }
  return <span className="auct-status auct-status--closed">● {status.toUpperCase()}</span>;
}

export function AuctionCard({ auction, onPlaceBid }: Props) {
  const { t } = useTranslation();
  const closesAt = auctionClosesAt(auction);
  const openedAt = auctionOpenedAt(auction);
  const isLive = auction.status === "open";
  const isAwarded = auction.status === "awarded";
  const isClosed = auction.status === "closed";

  return (
    <article className="oc oc--auction" aria-label={`Auction ${auction.oppNumber}`}>
      <div className="oc-head">
        <div className="oc-head-l">
          <span className="auct-badge">
            <Gavel size={11} /> {t("buyer.auctions.badge")}
          </span>
          <span className="dot-sep" />
          <span className="oc-temp">{auction.temperature}</span>
        </div>
        <StatusBadge status={auction.status} t={t} />
      </div>

      <div className="oc-title-block">
        <div className="auct-opp">{auction.oppNumber}</div>
        <div className="oc-title">
          <span className="auct-emoji" aria-hidden>{auction.emoji}</span> {auction.title}
        </div>
        <div className="auct-supplier-name">{auction.supplier}</div>
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("buyer.auctions.card.origin")}</span>
          <span className="cm-value">
            <FlagSVG code={auction.originCode} size={13} /> {auction.originCountry}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.auctions.card.destination")}</span>
          <span className="cm-value">
            <FlagSVG code={auction.destCode} size={13} /> {auction.destCountry}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.auctions.card.incoterm")}</span>
          <span className="cm-value">{auction.incoterm}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.auctions.card.shipment")}</span>
          <span className="cm-value">{auction.shipmentPeriod}</span>
        </div>
      </div>

      <div className="auct-footer">
        {isLive && (
          <>
            <div className="auct-footer-row">
              <AuctionCountdown closesAt={closesAt} openedAt={openedAt} showProgress />
              <span className="auct-bids-count">
                {t("buyer.auctions.card.bids", { count: auction.bidsCount }).toUpperCase()}
              </span>
            </div>
            <button type="button" className="auct-bid-btn" onClick={onPlaceBid}>
              ⚡ {t("buyer.auctions.placeBid")}
            </button>
          </>
        )}
        {isClosed && (
          <>
            <div className="auct-footer-row">
              <span className="auct-closed-label">{t("buyer.auctions.windowClosed")}</span>
              <span className="auct-bids-count">
                {t("buyer.auctions.card.bids", { count: auction.bidsCount }).toUpperCase()}
              </span>
            </div>
            <button type="button" className="auct-bid-btn is-disabled" disabled>
              {t("buyer.auctions.windowClosed")}
            </button>
          </>
        )}
        {isAwarded && (
          <div className="auct-awarded-banner">
            🔒 {t("buyer.auctions.awardedBanner")}
          </div>
        )}
      </div>
    </article>
  );
}

export default AuctionCard;