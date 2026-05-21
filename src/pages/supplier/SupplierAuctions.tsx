import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

const FILTER_KEYS: Array<"all" | AuctionStatus> = [
  "all", "scheduled", "open", "closed", "awarded", "cancelled",
];

function StatusBadge({ status, t }: { status: AuctionStatus; t: (k: string) => string }) {
  const map: Record<AuctionStatus, { cls: string; prefix: string }> = {
    scheduled: { cls: "auct-status--scheduled",  prefix: "● " },
    open:      { cls: "auct-status--live",       prefix: "● " },
    closed:    { cls: "auct-status--closed",     prefix: "● " },
    awarded:   { cls: "auct-status--awarded",    prefix: "🔒 " },
    cancelled: { cls: "auct-status--cancelled",  prefix: "● " },
  };
  const m = map[status];
  return (
    <span className={`auct-status ${m.cls}`}>
      {m.prefix}{t(`supplier.auctions.statusBadge.${status}`).toUpperCase()}
    </span>
  );
}

function AuctionRowCard({
  a,
  onOpen,
  t,
}: {
  a: MockAuction;
  onOpen: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
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
        <StatusBadge status={a.status} t={t} />
      </div>

      <div className="oc-title-block">
        <div className="auct-opp">{a.oppNumber}</div>
        <div className="oc-title">
          <span className="auct-emoji" aria-hidden>{a.emoji}</span> {a.title}
        </div>
        <div className="auct-supplier-name">{a.supplier}</div>
        <div className="cut-chips" style={{ marginTop: 8 }}>
          <span className="cut-chip">{a.containerCount}x{a.containerSize}</span>
          <span className="cut-chip">{a.incoterm}</span>
          <span className="cut-chip">{a.shipmentPeriod}</span>
        </div>
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("supplier.auctions.card.origin")}</span>
          <span className="cm-value">
            <FlagSVG code={a.originCode} size={13} /> {a.originCountry}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("supplier.auctions.card.destination")}</span>
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
              <span className="auct-bids-count">
                {t("supplier.auctions.card.bids", { count: a.bidsCount }).toUpperCase()}
              </span>
            </div>
            <span className="oc-cta">
              {t("supplier.auctions.card.viewAuction")} <ArrowRightIcon size={12} />
            </span>
          </>
        )}
        {a.status === "closed" && (
          <div className="auct-footer-row">
            <span className="auct-closed-label">
              {t("supplier.auctions.card.windowClosed")} · {t("supplier.auctions.card.bids", { count: a.bidsCount })}
            </span>
            <span className="oc-cta">{t("supplier.auctions.card.viewBids")} <ArrowRightIcon size={12} /></span>
          </div>
        )}
        {a.status === "awarded" && (
          <div className="auct-awarded-banner">
            🔒 {t("supplier.auctions.card.awardedBanner", { count: a.bidsCount })}
          </div>
        )}
        {a.status === "scheduled" && (
          <div className="auct-footer-row">
            <span className="auct-closed-label">{t("supplier.auctions.card.opensSoon")}</span>
            <span className="oc-cta">{t("supplier.auctions.card.manage")} <ArrowRightIcon size={12} /></span>
          </div>
        )}
        {a.status === "cancelled" && (
          <div className="auct-footer-row">
            <span className="auct-closed-label">{t("supplier.auctions.card.cancelled")}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default function SupplierAuctions() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<(typeof FILTER_KEYS)[number]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return MOCK_SUPPLIER_AUCTIONS;
    return MOCK_SUPPLIER_AUCTIONS.filter((a) => a.status === filter);
  }, [filter]);

  const handleCreate = () => {
    navigate("/supplier/auctions/create");
  };

  return (
    <>
      <PageTitle
        icon={Gavel as unknown as React.ComponentType<{ size?: number }>}
        title={t("supplier.auctions.title")}
        subtitle={t("supplier.auctions.subtitle")}
        right={
          <button type="button" className="sa-create-btn" onClick={handleCreate}>
            <PlusIcon size={14} /> {t("supplier.auctions.createCta")}
          </button>
        }
      />

      <div className="sa-pill-row">
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`sa-pill ${filter === key ? "is-active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {t(`supplier.auctions.filter.${key}`)}
            <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>
              {key === "all"
                ? MOCK_SUPPLIER_AUCTIONS.length
                : MOCK_SUPPLIER_AUCTIONS.filter((a) => a.status === key).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Gavel size={28} />
          <p>{t("supplier.auctions.emptyState")}</p>
        </div>
      ) : (
        <div className="card-row">
          {filtered.map((a) => (
            <AuctionRowCard
              key={a.id}
              a={a}
              onOpen={() => toast(`${t("supplier.auctions.detailComingSoon")} — ${a.oppNumber}`)}
              t={t}
            />
          ))}
        </div>
      )}
    </>
  );
}