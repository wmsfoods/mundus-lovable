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
} from "@/components/icons";
import { useOffers, type OfferWithDetails } from "@/hooks/useOffers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProteinFilter, type ProteinKey } from "@/components/marketplace/ProteinFilter";
import { useMarketplaceProteins, offerProtein } from "@/hooks/useMarketplaceProteins";
import { AuctionInfoDialog } from "@/components/marketplace/AuctionInfoDialog";
import { AuctionBidModal } from "@/components/marketplace/AuctionBidModal";
import type { MockAuction } from "@/data/mockAuctions";
import { Gavel } from "lucide-react";
import {
  OffersFilterBar,
  DEFAULT_OFFERS_FILTER,
  countActiveOfferFilters,
  type OffersFilterState,
  type TempValue,
} from "@/components/marketplace/OffersFilterBar";
import { formatOfferNumber } from "@/lib/offerNumber";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

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

export function OfferCard({
  offer,
  onOpen,
  myNeg,
}: {
  offer: OfferWithDetails;
  onOpen: () => void;
  myNeg?: { id: string; status: string };
}) {
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
      style={{ position: "relative" }}
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
          <span className="dot-sep" />
          <span
            className="oc-num"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {formatOfferNumber(offer.offer_number, offer.created_at)}
          </span>
          {mixed && (
            <span className="mixed-badge">
              <GridIcon size={9} /> {t("buyer.offers.card.cuts", { count: items.length })}
            </span>
          )}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span className="status-pill" style={{ background: status.bg, color: status.fg }}>
            <span className="status-dot" style={{ background: status.dot }} />
            {statusLabel}
          </span>
          {myNeg && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 12,
                background: myNeg.status === "bid_accepted" ? "#0ea5e9" : "#8B2252",
                color: "white",
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {myNeg.status === "bid_accepted" ? "✅ Deal closed" : "🤝 Negotiating"}
            </span>
          )}
          {offer.remaining_fcl != null
            && offer.total_fcl != null
            && offer.remaining_fcl < offer.total_fcl && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 12,
                background: "#fef3c7",
                color: "#92400e",
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {offer.remaining_fcl} of {offer.total_fcl} FCL available
            </span>
          )}
        </span>
      </div>

      <div className="oc-title-block">
        <div className="oc-title">{title}</div>
        {mixed ? (
          <div className="cut-chips">
            {items.slice(0, 3).map((it) => (
              <span key={it.id} className="cut-chip" style={{ display: "inline-flex", alignItems: "center" }}>
                <CutThumb src={cutImgs[(it.customer_product?.name ?? "").split(",")[0]]} size={20} />
                {(it.customer_product?.name ?? "Product / Cut").split(",")[0]}
              </span>
            ))}
            {items.length > 3 && (
              <span className="cut-chip is-more">
                {t("buyer.offers.card.moreCuts", { count: items.length - 3 })}
              </span>
            )}
          </div>
        ) : (
          <div className="oc-cut-text" style={{ display: "inline-flex", alignItems: "center" }}>
            <CutThumb src={cutImgs[(firstItem?.customer_product?.name ?? "").split(",")[0]]} size={20} />
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
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc" | "volumeDesc">("newest");
  const [auctionsOnly, setAuctionsOnly] = useState(false);
  const [bidAuction, setBidAuction] = useState<MockAuction | null>(null);
  const [filter, setFilter] = useState<OffersFilterState>(DEFAULT_OFFERS_FILTER);

  const { company } = useCurrentCompany();
  const buyerCompanyId = company?.id ?? null;

  const { data: myNegotiations } = useQuery({
    queryKey: ["my-negotiations-map", buyerCompanyId],
    enabled: !!buyerCompanyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("negotiations")
        .select("id, offer_id, status")
        .eq("buyer_company_id", buyerCompanyId!)
        .not("status", "in", "(expired,offer_withdrawn)")
        .is("deleted_at", null);
      return data || [];
    },
  });

  const myNegMap = useMemo(() => {
    const map: Record<string, { id: string; status: string }> = {};
    myNegotiations?.forEach((n) => {
      map[n.offer_id] = { id: n.id, status: n.status };
    });
    return map;
  }, [myNegotiations]);

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

  const filterOptions = useMemo(() => {
    const temps = new Set<TempValue>();
    const origins = new Set<string>();
    const incoterms = new Set<string>();
    const markets = new Set<string>();
    for (const o of offers) {
      for (const it of o.items ?? []) {
        const c = (it.condition ?? "").trim();
        if (c === "Frozen" || c === "Chilled" || c === "Fresh") temps.add(c);
      }
      if (o.origin_country) origins.add(o.origin_country);
      for (const i of o.incoterms ?? []) {
        if (i.incoterm_type) incoterms.add(i.incoterm_type);
      }
      for (const m of o.markets ?? []) {
        const n = m?.market?.country?.english_name;
        if (n) markets.add(n);
      }
    }
    return {
      temps: Array.from(temps),
      origins: Array.from(origins),
      incoterms: Array.from(incoterms),
      markets: Array.from(markets),
    };
  }, [offers]);

  const filtered = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    let copy = [...offers];
    if (protein !== "all") {
      copy = copy.filter((o) => offerProtein(o) === protein);
    }
    if (filter.temp !== "all") {
      copy = copy.filter((o) =>
        (o.items ?? []).some((it) => it.condition === filter.temp),
      );
    }
    if (filter.origins.length > 0) {
      copy = copy.filter((o) =>
        o.origin_country ? filter.origins.includes(o.origin_country) : false,
      );
    }
    if (filter.incoterms.length > 0) {
      copy = copy.filter((o) =>
        (o.incoterms ?? []).some((i) =>
          filter.incoterms.includes(i.incoterm_type),
        ),
      );
    }
    if (filter.markets.length > 0) {
      copy = copy.filter((o) =>
        (o.markets ?? []).some((m) =>
          m?.market?.country?.english_name
            ? filter.markets.includes(m.market.country.english_name)
            : false,
        ),
      );
    }
    if (filter.halal !== "any") {
      copy = copy.filter((o) =>
        filter.halal === "yes" ? !!o.is_halal : !o.is_halal,
      );
    }
    if (filter.kosher !== "any") {
      copy = copy.filter((o) =>
        filter.kosher === "yes" ? !!o.is_kosher : !o.is_kosher,
      );
    }
    if (q) {
      copy = copy.filter((o) => {
        const inOrigin = (o.origin_country ?? "").toLowerCase().includes(q);
        const inSupplier = (o.supplier_name ?? "").toLowerCase().includes(q);
        const inPort = (o.origin_port ?? "").toLowerCase().includes(q);
        const inItems = (o.items ?? []).some((it) =>
          (it.customer_product?.name ?? "").toLowerCase().includes(q),
        );
        return inOrigin || inSupplier || inPort || inItems;
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
  }, [offers, protein, filter, sortBy]);

  const total = filtered.length;
  const totalMT = filtered.reduce(
    (sum, o) => sum + (o.items ?? []).reduce((s, it) => s + Number(it.amount ?? 0), 0),
    0
  ) / 1000;

  const activeFilterCount = countActiveOfferFilters(filter);
  const hasActiveFilters = protein !== "all" || activeFilterCount > 0;
  const clearAll = () => {
    setProtein("all");
    setFilter(DEFAULT_OFFERS_FILTER);
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
        <div className="bo-filter-row" style={{ alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className={`bo-filter-pill ${auctionsOnly ? "is-active" : ""}`}
            onClick={() => setAuctionsOnly((v) => !v)}
            aria-pressed={auctionsOnly}
          >
            <Gavel size={13} /> 🔨 {t("buyer.auctions.filter")}
            <span style={{ opacity: 0.7, marginLeft: 4 }}>0</span>
          </button>
          <AuctionInfoDialog />
          <div className="mini-select-wrap" style={{ marginLeft: "auto" }}>
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
        </div>
        <OffersFilterBar
          value={filter}
          onChange={setFilter}
          options={filterOptions}
          searchPlaceholder={t("buyer.offers.searchPlaceholder", "Search products, ports...")}
          proteinNode={
            <ProteinFilter
              value={protein}
              onChange={setProtein}
              available={marketProteins}
              counts={proteinCounts}
            />
          }
        />
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
          {(auctionsOnly ? [] : filtered).map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              myNeg={myNegMap[offer.id]}
              onOpen={() => navigate(`/buyer/offers/${offer.id}`)}
            />
          ))}
        </div>
      )}
      {bidAuction && (
        <AuctionBidModal
          open={!!bidAuction}
          onOpenChange={(o) => { if (!o) setBidAuction(null); }}
          auction={bidAuction}
        />
      )}
    </>
  );
}
