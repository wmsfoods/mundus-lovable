import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  TagIcon,
  KnifeForkIcon,
  ArrowRightIcon,
  SearchIcon,
  GridIcon,
  FlagSVG,
  XIcon,
} from "@/components/icons";
import { useOffers, type OfferWithDetails } from "@/hooks/useOffers";
import { ProteinFilter, type ProteinKey } from "@/components/marketplace/ProteinFilter";
import { useMarketplaceProteins, offerProtein } from "@/hooks/useMarketplaceProteins";
import { AuctionCard } from "@/components/marketplace/AuctionCard";
import { AuctionInfoDialog } from "@/components/marketplace/AuctionInfoDialog";
import { MOCK_BUYER_AUCTIONS } from "@/data/mockAuctions";
import { toast } from "sonner";
import { Gavel } from "lucide-react";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const COUNTRY_CODE_MAP: Record<string, string> = {
  argentina: "AR",
  australia: "AU",
  brazil: "BR",
  canada: "CA",
  chile: "CL",
  china: "CN",
  egypt: "EG",
  france: "FR",
  germany: "DE",
  "hong kong": "HK",
  india: "IN",
  italy: "IT",
  japan: "JP",
  jordan: "JO",
  mexico: "MX",
  netherlands: "NL",
  paraguay: "PY",
  poland: "PL",
  "saudi arabia": "SA",
  "south africa": "ZA",
  "south korea": "KR",
  spain: "ES",
  turkey: "TR",
  "united arab emirates": "AE",
  uae: "AE",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  uruguay: "UY",
  vietnam: "VN",
};

function countryToCode(name: string | null | undefined): string {
  if (!name) return "";
  return COUNTRY_CODE_MAP[name.trim().toLowerCase()] ?? "";
}

function formatShipment(month: number, year: number): string {
  const m = MONTH_NAMES[(month - 1) % 12] ?? "";
  return `${m} ${year}`;
}

function formatMT(kg: number): string {
  const mt = kg / 1000;
  if (Number.isInteger(mt)) return mt.toString();
  return mt.toFixed(1);
}

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string; key: string }> = {
  active:      { bg: "#e6f7ed", fg: "#15803d", dot: "#16a34a", key: "active" },
  new:         { bg: "#fff4e0", fg: "#a85b00", dot: "#f59e0b", key: "new" },
  negotiating: { bg: "#fef0f0", fg: "#b6354b", dot: "#d65370", key: "negotiating" },
  closed:      { bg: "#eeeef0", fg: "#6b7280", dot: "#9ca3af", key: "closed" },
};

function statusFor(s: string | null) {
  if (!s) return STATUS_COLORS.active;
  return STATUS_COLORS[s.toLowerCase()] ?? STATUS_COLORS.active;
}

function OfferCard({ offer, onOpen }: { offer: OfferWithDetails; onOpen: () => void }) {
  const { t } = useTranslation();
  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];

  const category =
    firstItem?.customer_product?.standard_product?.product_category?.name_en ??
    t("buyer.offers.card.defaultCategory");
  const condition = firstItem?.condition ?? "—";

  const title = mixed
    ? t("buyer.offers.card.mixedTitle", { count: items.length })
    : firstItem?.customer_product?.name ?? "Offer";

  const firstMarket = offer.markets?.[0]?.market?.country?.english_name ?? null;
  const extraMarkets = Math.max(0, (offer.markets?.length ?? 0) - 1);
  const destinationLabel = firstMarket
    ? extraMarkets > 0
      ? `${firstMarket} +${extraMarkets}`
      : firstMarket
    : "—";

  const firstIncoterm = offer.incoterms?.[0]?.incoterm_type ?? null;
  const extraIncoterms = Math.max(0, (offer.incoterms?.length ?? 0) - 1);
  const incotermLabel = firstIncoterm
    ? extraIncoterms > 0
      ? `${firstIncoterm} +${extraIncoterms}`
      : `${firstIncoterm} ${offer.origin_port}`
    : offer.origin_port;

  const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);

  const status = statusFor(offer.status);
  const statusLabel = t(`buyer.offers.status.${status.key}`);

  const originCode = countryToCode(offer.origin_country);
  const destCode = countryToCode(firstMarket);

  return (
    <article
      className="oc"
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
          <span className="oc-chip">
            <KnifeForkIcon size={14} />
          </span>
          <span className="oc-cat">{category}</span>
          <span className="dot-sep" />
          <span className="oc-temp">{condition}</span>
          {mixed && (
            <span className="mixed-badge">
              <GridIcon size={9} /> {t("buyer.offers.card.cuts", { count: items.length })}
            </span>
          )}
        </div>
        <span className="status-pill" style={{ background: status.bg, color: status.fg }}>
          <span className="status-dot" style={{ background: status.dot }} />
          {statusLabel}
        </span>
      </div>

      <div className="oc-title-block">
        <div className="oc-title">{title}</div>
        {mixed ? (
          <div className="cut-chips">
            {items.slice(0, 3).map((it) => (
              <span key={it.id} className="cut-chip">
                {(it.customer_product?.name ?? "Cut").split(",")[0]}
              </span>
            ))}
            {items.length > 3 && (
              <span className="cut-chip is-more">
                {t("buyer.offers.card.moreCuts", { count: items.length - 3 })}
              </span>
            )}
          </div>
        ) : (
          <div className="oc-cut-text">
            {firstItem?.customer_product?.name ?? offer.supplier_name}
          </div>
        )}
      </div>

      <div className="oc-meta-grid">
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.origin")}</span>
          <span className="cm-value">
            {originCode && <FlagSVG code={originCode} size={13} />}
            {offer.origin_country}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.destination")}</span>
          <span className="cm-value">
            {destCode && <FlagSVG code={destCode} size={13} />}
            {destinationLabel}
          </span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.incoterm")}</span>
          <span className="cm-value">{incotermLabel}</span>
        </div>
        <div className="cm">
          <span className="cm-label">{t("buyer.offers.card.shipment")}</span>
          <span className="cm-value">
            {formatShipment(offer.shipment_month, offer.shipment_year)}
          </span>
        </div>
      </div>

      <div className="oc-footer">
        <div className="oc-price">
          <span className="cur">{t("buyer.offers.card.qty")}</span>
          <span className="amt">{formatMT(totalKg)}</span>
          <span className="unit">
            MT · {offer.container_size}
            {offer.total_fcl ? ` (${offer.total_fcl})` : ""}
          </span>
        </div>
        <span className="oc-cta">
          {mixed ? t("buyer.offers.card.viewBreakdown") : t("buyer.offers.card.viewDetails")}
          <ArrowRightIcon size={12} />
        </span>
      </div>
    </article>
  );
}

export default function BuyerOffers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { offers, loading, error } = useOffers();
  const { available: marketProteins, counts: proteinCounts } = useMarketplaceProteins();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialProtein = (searchParams.get("protein") as ProteinKey | null) ?? "all";
  const [protein, setProtein] = useState<ProteinKey>(initialProtein);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc" | "volumeDesc">("newest");
  const [auctionsOnly, setAuctionsOnly] = useState(false);

  // Keep URL in sync when user changes the protein pill.
  useEffect(() => {
    const current = searchParams.get("protein");
    if (protein === "all" && current) {
      searchParams.delete("protein");
      setSearchParams(searchParams, { replace: true });
    } else if (protein !== "all" && current !== protein) {
      searchParams.set("protein", protein);
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protein]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let copy = [...offers];
    if (protein !== "all") {
      copy = copy.filter((o) => offerProtein(o) === protein);
    }
    if (q) {
      copy = copy.filter((o) => {
        const inOrigin = (o.origin_country ?? "").toLowerCase().includes(q);
        const inSupplier = (o.supplier_name ?? "").toLowerCase().includes(q);
        const inItems = (o.items ?? []).some((it) =>
          (it.customer_product?.name ?? "").toLowerCase().includes(q)
        );
        return inOrigin || inSupplier || inItems;
      });
    }
    copy.sort((a, b) => {
      if (sortBy === "newest") {
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
      const totalKg = (o: OfferWithDetails) =>
        (o.items ?? []).reduce((s, it) => s + Number(it.amount ?? 0), 0);
      const avgPrice = (o: OfferWithDetails) => {
        const items = o.items ?? [];
        if (!items.length) return 0;
        const sum = items.reduce((s, it) => s + Number(it.price ?? 0), 0);
        return sum / items.length;
      };
      if (sortBy === "priceAsc") return avgPrice(a) - avgPrice(b);
      if (sortBy === "priceDesc") return avgPrice(b) - avgPrice(a);
      return totalKg(b) - totalKg(a);
    });
    return copy;
  }, [offers, protein, search, sortBy]);

  const total = filtered.length;
  const totalMT = filtered.reduce(
    (sum, o) => sum + (o.items ?? []).reduce((s, it) => s + Number(it.amount ?? 0), 0),
    0
  ) / 1000;

  const hasActiveFilters = protein !== "all" || search.trim().length > 0;
  const clearAll = () => {
    setProtein("all");
    setSearch("");
    setAuctionsOnly(false);
  };

  return (
    <>
      <div className="crumbs">
        <a onClick={(e) => { e.preventDefault(); navigate("/buyer"); }} href="/buyer">
          {t("buyer.offers.crumbHome")}
        </a>
        <span className="sep">›</span>
        <b>{t("buyer.offers.title")}</b>
      </div>

      <div className="page-title">
        <span className="chip">
          <TagIcon size={20} />
        </span>
        <h1>{t("buyer.offers.title")}</h1>
      </div>

      <div className="bo-filterbar">
        <ProteinFilter
          value={protein}
          onChange={setProtein}
          available={marketProteins}
          counts={proteinCounts}
        />
        <div className="bo-filter-row" style={{ alignItems: "center" }}>
          <button
            type="button"
            className={`bo-filter-pill ${auctionsOnly ? "is-active" : ""}`}
            onClick={() => setAuctionsOnly((v) => !v)}
            aria-pressed={auctionsOnly}
          >
            <Gavel size={13} /> 🔨 {t("buyer.auctions.filter")}
            <span style={{ opacity: 0.7, marginLeft: 4 }}>{MOCK_BUYER_AUCTIONS.length}</span>
          </button>
          <AuctionInfoDialog />
        </div>
        <div className="bo-filter-row">
          <div className="bo-search">
            <span className="bo-search-icon"><SearchIcon size={16} /></span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("buyer.offers.searchPlaceholder", "Search by cut, origin, supplier…")}
              aria-label="Search offers"
            />
          </div>
          <div className="mini-select-wrap">
            <select
              className="mini-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort offers"
            >
              <option value="newest">{t("buyer.offers.sort.newest", "Newest first")}</option>
              <option value="priceAsc">{t("buyer.offers.sort.priceAsc", "Price: low to high")}</option>
              <option value="priceDesc">{t("buyer.offers.sort.priceDesc", "Price: high to low")}</option>
              <option value="volumeDesc">{t("buyer.offers.sort.volumeDesc", "Largest volume")}</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="bo-active-chips">
              {protein !== "all" && (
                <span className="bo-chip">
                  {protein.charAt(0).toUpperCase() + protein.slice(1)}
                  <button type="button" onClick={() => setProtein("all")} aria-label="Clear protein">
                    <XIcon size={12} />
                  </button>
                </span>
              )}
              {search.trim() && (
                <span className="bo-chip">
                  “{search.trim()}”
                  <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                    <XIcon size={12} />
                  </button>
                </span>
              )}
              <button type="button" className="bo-chip-clear" onClick={clearAll}>
                {t("buyer.offers.clearAll", "Clear all")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="result-bar">
        <span className="result-count">
          {loading
            ? t("buyer.offers.loading")
            : (
              <>
                {t(total === 1 ? "buyer.offers.showing_one" : "buyer.offers.showing_other", {
                  count: total,
                  mt: totalMT % 1 === 0 ? totalMT : totalMT.toFixed(1),
                }).split(/(<1>.*?<\/1>)/).map((chunk, i) => {
                  const m = chunk.match(/^<1>(.*)<\/1>$/);
                  return m ? <b key={i}>{m[1]}</b> : <span key={i}>{chunk}</span>;
                })}
              </>
            )}
        </span>
      </div>

      {error ? (
        <div className="offers-error">{t("buyer.offers.loadError", { error })}</div>
      ) : loading ? (
        <div className="offers-loading">{t("buyer.offers.loadingShort")}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <SearchIcon size={28} stroke="var(--g300)" />
          <p>{hasActiveFilters ? t("buyer.offers.noResults", "No offers match your filters.") : t("buyer.offers.empty")}</p>
          {hasActiveFilters && (
            <button type="button" className="bo-chip-clear" onClick={clearAll}>
              {t("buyer.offers.clearAll", "Clear all")}
            </button>
          )}
        </div>
      ) : (
        <div className="card-row">
          {(() => {
            // Interleave auction cards into the grid at positions 0, 3, 6 (1st, 4th, 7th).
            // When the user toggles "Auctions only", regular offer cards are hidden.
            const nodes: React.ReactNode[] = [];
            const auctions = MOCK_BUYER_AUCTIONS;
            const regulars = auctionsOnly ? [] : filtered;
            const INSERT_AT = [0, 3, 6];
            let ai = 0;
            let ri = 0;
            let position = 0;
            while (ai < auctions.length || ri < regulars.length) {
              if (INSERT_AT.includes(position) && ai < auctions.length) {
                const a = auctions[ai++];
                nodes.push(
                  <AuctionCard
                    key={`auction-${a.id}`}
                    auction={a}
                    onPlaceBid={() => toast(t("buyer.auctions.placeBidToast"))}
                  />
                );
              } else if (ri < regulars.length) {
                const offer = regulars[ri++];
                nodes.push(
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onOpen={() => navigate(`/buyer/offers/${offer.id}`)}
                  />
                );
              } else if (ai < auctions.length) {
                const a = auctions[ai++];
                nodes.push(
                  <AuctionCard
                    key={`auction-${a.id}`}
                    auction={a}
                    onPlaceBid={() => toast(t("buyer.auctions.placeBidToast"))}
                  />
                );
              }
              position++;
            }
            return nodes;
          })()}
        </div>
      )}
    </>
  );
}
