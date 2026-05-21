import { FlagSVG } from "@/components/icons";
import { Gavel } from "lucide-react";
import { AuctionCountdown } from "./AuctionCountdown";
import { auctionClosesAt, auctionOpenedAt, type MockAuction } from "@/data/mockAuctions";

type Props = {
  auction: MockAuction;
  onPlaceBid?: () => void;
};

function StatusBadge({ status }: { status: MockAuction["status"] }) {
  if (status === "open") {
    return (
      <span className="auct-status auct-status--live">
        <span className="auct-pulse" aria-hidden />
        LIVE
      </span>
    );
  }
  if (status === "awarded") {
    return <span className="auct-status auct-status--awarded">● AWARDED</span>;
  }
  if (status === "closed") {
    return <span className="auct-status auct-status--closed">● CLOSED</span>;
  }
  if (status === "scheduled") {
    return <span className="auct-status auct-status--scheduled">● SCHEDULED</span>;
  }
  return <span className="auct-status auct-status--closed">● {status.toUpperCase()}</span>;
}

export function AuctionCard({ auction, onPlaceBid }: Props) {
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
            <Gavel size={11} /> AUCTION
          </span>
          <span className="dot-sep" />
          <span className="oc-temp">{auction.temperature}</span>
        </div>
        <StatusBadge status={auction.status} />
      </div>

      <div className="oc-title-block">
        <div className="auct-opp">{auction.oppNumber}</div>
        <div className="oc-title">
          <span className="auct-emoji" aria-hidden>{auction.emoji}</span> {auction.title}
        </div>
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">Origin</span>
          <span className="cm-value">
            <FlagSVG code={auction.originCode} size={13} /> {auction.originCountry}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">Destination</span>
          <span className="cm-value">
            <FlagSVG code={auction.destCode} size={13} /> {auction.destCountry}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">Incoterm</span>
          <span className="cm-value">{auction.incoterm}</span>
        </div>
        <div className="cm">
          <span className="cm-label">Shipment</span>
          <span className="cm-value">{auction.shipmentPeriod}</span>
        </div>
      </div>

      <div className="auct-footer">
        {isLive && (
          <>
            <div className="auct-footer-row">
              <AuctionCountdown closesAt={closesAt} openedAt={openedAt} showProgress />
              <span className="auct-bids-count">{auction.bidsCount} BIDS</span>
            </div>
            <button type="button" className="auct-bid-btn" onClick={onPlaceBid}>
              ⚡ Place Bid
            </button>
          </>
        )}
        {isClosed && (
          <>
            <div className="auct-footer-row">
              <span className="auct-closed-label">Window Closed</span>
              <span className="auct-bids-count">{auction.bidsCount} BIDS</span>
            </div>
            <button type="button" className="auct-bid-btn is-disabled" disabled>
              Window Closed
            </button>
          </>
        )}
        {isAwarded && (
          <div className="auct-awarded-banner">
            🔒 Awarded · contract issued
          </div>
        )}
      </div>
    </article>
  );
}

export default AuctionCard;