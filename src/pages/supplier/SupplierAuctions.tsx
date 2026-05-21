import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Gavel } from "lucide-react";
import { PageTitle } from "@/components/mundus/PageTitle";
import { PlusIcon, FlagSVG, ArrowRightIcon } from "@/components/icons";
import { AuctionCountdown } from "@/components/marketplace/AuctionCountdown";
import {
  MOCK_SUPPLIER_AUCTIONS,
  auctionClosesAt,
  auctionOpenedAt,
  type MockAuction,
  type AuctionStatus,
} from "@/data/mockAuctions";

const FILTERS: Array<{ key: "all" | AuctionStatus; label: string }> = [
  { key: "all",       label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "open",      label: "Open" },
  { key: "closed",    label: "Closed" },
  { key: "awarded",   label: "Awarded" },
];

function StatusBadge({ status }: { status: AuctionStatus }) {
  const map: Record<AuctionStatus, { cls: string; label: string }> = {
    scheduled: { cls: "auct-status--scheduled", label: "● SCHEDULED" },
    open:      { cls: "auct-status--live",      label: "● LIVE" },
    closed:    { cls: "auct-status--closed",    label: "● CLOSED" },
    awarded:   { cls: "auct-status--awarded",   label: "🔒 AWARDED" },
    cancelled: { cls: "auct-status--closed",    label: "● CANCELLED" },
  };
  const m = map[status];
  return <span className={`auct-status ${m.cls}`}>{m.label}</span>;
}

function AuctionRowCard({ a, onOpen }: { a: MockAuction; onOpen: () => void }) {
  const closesAt = auctionClosesAt(a);
  const openedAt = auctionOpenedAt(a);

  return (
    <article
      className="oc oc--auction"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="oc-head">
        <div className="oc-head-l">
          <span className="auct-badge"><Gavel size={11} /> AUCTION</span>
          <span className="dot-sep" />
          <span className="oc-temp">{a.temperature}</span>
        </div>
        <StatusBadge status={a.status} />
      </div>

      <div className="oc-title-block">
        <div className="auct-opp">{a.oppNumber}</div>
        <div className="oc-title">
          <span className="auct-emoji" aria-hidden>{a.emoji}</span> {a.title}
        </div>
        <div className="cut-chips" style={{ marginTop: 8 }}>
          <span className="cut-chip">{a.containerCount}x{a.containerSize}</span>
          <span className="cut-chip">{a.incoterm}</span>
          <span className="cut-chip">{a.shipmentPeriod}</span>
        </div>
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">Origin</span>
          <span className="cm-value">
            <FlagSVG code={a.originCode} size={13} /> {a.originCountry}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">Destination</span>
          <span className="cm-value">
            <FlagSVG code={a.destCode} size={13} /> {a.destCountry}
          </span>
        </div>
      </div>

      <div className="auct-footer">
        {a.status === "open" && (
          <>
            <div className="auct-footer-row">
              <AuctionCountdown closesAt={closesAt} openedAt={openedAt} showProgress />
              <span className="auct-bids-count">{a.bidsCount} BIDS</span>
            </div>
            <span className="oc-cta">
              View Auction <ArrowRightIcon size={12} />
            </span>
          </>
        )}
        {a.status === "closed" && (
          <div className="auct-footer-row">
            <span className="auct-closed-label">Window Closed · {a.bidsCount} bids</span>
            <span className="oc-cta">View Bids <ArrowRightIcon size={12} /></span>
          </div>
        )}
        {a.status === "awarded" && (
          <div className="auct-awarded-banner">🔒 Awarded · {a.bidsCount} bids received</div>
        )}
        {a.status === "scheduled" && (
          <div className="auct-footer-row">
            <span className="auct-closed-label">Opens soon</span>
            <span className="oc-cta">Manage <ArrowRightIcon size={12} /></span>
          </div>
        )}
      </div>
    </article>
  );
}

export default function SupplierAuctions() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return MOCK_SUPPLIER_AUCTIONS;
    return MOCK_SUPPLIER_AUCTIONS.filter((a) => a.status === filter);
  }, [filter]);

  const handleCreate = () => {
    toast("Coming soon — Create Auction flow");
    navigate("/supplier/auctions");
  };

  return (
    <>
      <PageTitle
        icon={Gavel as unknown as React.ComponentType<{ size?: number }>}
        title="My Auctions"
        subtitle="Create sealed-bid auctions for your products"
        right={
          <button type="button" className="sa-create-btn" onClick={handleCreate}>
            <PlusIcon size={14} /> Create Auction
          </button>
        }
      />

      <div className="sa-pill-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`sa-pill ${filter === f.key ? "is-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>
              {f.key === "all"
                ? MOCK_SUPPLIER_AUCTIONS.length
                : MOCK_SUPPLIER_AUCTIONS.filter((a) => a.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Gavel size={28} />
          <p>No auctions in this status.</p>
        </div>
      ) : (
        <div className="card-row">
          {filtered.map((a) => (
            <AuctionRowCard
              key={a.id}
              a={a}
              onOpen={() => toast(`Auction detail coming soon — ${a.oppNumber}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}