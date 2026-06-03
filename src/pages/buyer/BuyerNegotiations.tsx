import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageIcon, SearchIcon, ChevronRightIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { NegotiationsFilterSheet } from "@/components/marketplace/NegotiationsFilterSheet";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import {
  MobileNegoBidCard,
  MobileNegoGroup,
  MobileNegoTabs,
  type MobileNegoStatusTone,
} from "@/components/negotiation/MobileNegotiationCard";
import {
  useBuyerNegotiations,
  type BuyerNegotiationBid,
  type BuyerNegotiationStatus,
  type BuyerParentOffer,
} from "@/hooks/useBuyerNegotiations";

type Filter = BuyerNegotiationStatus | "all";
type SortKey = "recent" | "oldest" | "priority";
type MobileTab = "needs_you" | "waiting" | "closed";

const TAB_OF_STATUS: Record<BuyerNegotiationStatus, MobileTab> = {
  action_required: "needs_you",
  final_round: "needs_you",
  awaiting_supplier: "waiting",
  accepted: "closed",
  rejected: "closed",
  expired: "closed",
};

const STATUS_TONE: Record<BuyerNegotiationStatus, MobileNegoStatusTone> = {
  action_required: "action_required",
  awaiting_supplier: "awaiting",
  final_round: "final_round",
  accepted: "accepted",
  rejected: "rejected",
  expired: "expired",
};

const AVATAR_TONES = ["indigo", "blue", "rose", "amber", "green", "slate"] as const;
function toneFor(seed: string): typeof AVATAR_TONES[number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

const STATUS_PILL: Record<BuyerNegotiationStatus, string> = {
  action_required: "pill-action-required",
  awaiting_supplier: "pill-awaiting-buyer",
  final_round: "pill-final-round",
  accepted: "pill-deal-closed",
  rejected: "pill-rejected-nego",
  expired: "pill-expired",
};

const PRIORITY: Record<BuyerNegotiationStatus, number> = {
  action_required: 0,
  final_round: 1,
  awaiting_supplier: 2,
  accepted: 3,
  rejected: 4,
  expired: 5,
};

function fmtUsd(v: number) {
  return `$${new Intl.NumberFormat("en-US").format(v)}`;
}
function fmtDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" }).format(new Date(iso));
}

export default function BuyerNegotiations() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: offers, offerCount, bidCount, isLoading, error } = useBuyerNegotiations();
  const locale = i18n.language || "en";
  const isMobile = useIsMobileShell();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileTab, setMobileTab] = useState<MobileTab>("needs_you");

  const allBids = useMemo(
    () => offers.flatMap((p) => p.bids.map((b) => ({ ...b, parentTitle: p.title, oppWmsRef: p.oppWmsRef }))),
    [offers],
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: allBids.length,
      action_required: 0, awaiting_supplier: 0, final_round: 0,
      accepted: 0, rejected: 0, expired: 0,
    };
    for (const b of allBids) c[b.status]++;
    return c;
  }, [allBids]);

  const filteredAndSortedBids = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allBids.filter((b) => {
      if (filter !== "all" && b.status !== filter) return false;
      if (!q) return true;
      const hay = `${b.id} ${b.supplierName} ${b.parentTitle} ${b.originCountry} ${b.originPort}`.toLowerCase();
      return hay.includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "priority") return PRIORITY[a.status] - PRIORITY[b.status];
      const av = new Date(a.updatedAt).getTime();
      const bv = new Date(b.updatedAt).getTime();
      return sortBy === "recent" ? bv - av : av - bv;
    });
    return list;
  }, [allBids, filter, query, sortBy]);

  const groups = useMemo(() => {
    const map = new Map<string, BuyerParentOffer & { _bids: BuyerNegotiationBid[] }>();
    for (const o of offers) map.set(o.id, { ...o, _bids: [] });
    for (const b of filteredAndSortedBids) {
      const g = map.get(b.parentOfferId);
      if (g) g._bids.push(b);
    }
    return Array.from(map.values()).filter((g) => g._bids.length > 0);
  }, [offers, filteredAndSortedBids]);

  const toggle = (id: string) => setOpenGroups((p) => ({ ...p, [id]: !p[id] }));

  const CHIPS: { key: Filter; label: string }[] = [
    { key: "all", label: t("buyer.negotiations.chips.all") },
    { key: "action_required", label: t("buyer.negotiations.chips.action_required") },
    { key: "awaiting_supplier", label: t("buyer.negotiations.chips.awaiting_supplier") },
    { key: "final_round", label: t("buyer.negotiations.chips.final_round") },
    { key: "accepted", label: t("buyer.negotiations.chips.accepted") },
    { key: "rejected", label: t("buyer.negotiations.chips.rejected") },
    { key: "expired", label: t("buyer.negotiations.chips.expired") },
  ];

  return (
    <>
      <Crumbs
        items={[
          { label: t("shell.nav.home"), to: "/buyer" },
          { label: t("buyer.negotiations.title") },
        ]}
      />

      <PageTitle icon={MessageIcon} title={t("buyer.negotiations.title")} />

      <NegotiationsFilterSheet
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortChange={(v) => setSortBy(v as SortKey)}
        filter={filter}
        onFilterChange={(v) => setFilter(v as Filter)}
        chips={CHIPS.map((c) => ({ key: c.key, label: c.label, count: counts[c.key] }))}
        sortLabels={{
          recent: t("buyer.negotiations.sort.recent"),
          oldest: t("buyer.negotiations.sort.oldest"),
          priority: t("buyer.negotiations.sort.priority"),
        }}
        searchPlaceholder={t("buyer.negotiations.searchPlaceholder")}
        i18n={{
          filters: t("common.filters", "Filters"),
          sort: t("common.sort", "Sort"),
          status: t("common.status", "Status"),
          clear: t("common.clear", "Clear"),
          cancel: t("common.cancel", "Cancel"),
          apply: t("common.apply", "Apply"),
        }}
      />

      {!isMobile && (
      <>
      <div className="nego-toolbar">
        <div className="search-input">
          <span className="ic"><SearchIcon size={16} /></span>
          <input
            placeholder={t("buyer.negotiations.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="mini-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
        >
          <option value="recent">{t("buyer.negotiations.sort.recent")}</option>
          <option value="oldest">{t("buyer.negotiations.sort.oldest")}</option>
          <option value="priority">{t("buyer.negotiations.sort.priority")}</option>
        </select>
        <span className="nego-counts">
          {t("buyer.negotiations.counts", { offers: offerCount, bids: bidCount })}
        </span>
      </div>

      <div className="nego-chips" role="tablist">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={filter === c.key}
            className={`nego-chip ${filter === c.key ? "is-active" : ""}`.trim()}
            onClick={() => setFilter(c.key)}
          >
            {c.label}
            <span className="count">{counts[c.key]}</span>
          </button>
        ))}
      </div>
      </>
      )}

      {isLoading ? (
        <div className="detail-empty">
          <p>Loading negotiations…</p>
        </div>
      ) : error ? (
        <div className="detail-empty" style={{ color: "#b91c1c" }}>
          <p>Error loading negotiations: {error.message}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="detail-empty">
          <p>{t("buyer.negotiations.empty")}</p>
        </div>
      ) : (
        <div className="data-table-wrap has-mobile-cards">
          <table className="nego-table">
            <thead>
              <tr>
                <th>{t("buyer.negotiations.col.offerSupplier")}</th>
                <th>{t("buyer.negotiations.col.round")}</th>
                <th>{t("buyer.negotiations.col.yourBid")}</th>
                <th>{t("buyer.negotiations.col.supplierCounter")}</th>
                <th>{t("buyer.negotiations.col.origin")}</th>
                <th>{t("buyer.negotiations.col.status")}</th>
                <th>{t("buyer.negotiations.col.updated")}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const isOpen = openGroups[g.id] !== false;
                const bids = g._bids;
                const rounds = new Set(bids.map((b) => b.round));
                const sameRound = rounds.size === 1;
                const bidVals = bids.map((b) => b.yourBidUsd);
                const cntVals = bids
                  .map((b) => b.supplierCounterUsd)
                  .filter((v): v is number => v != null);
                const minBid = Math.min(...bidVals);
                const maxBid = Math.max(...bidVals);
                const minCnt = cntVals.length ? Math.min(...cntVals) : null;
                const maxCnt = cntVals.length ? Math.max(...cntVals) : null;
                const countries = Array.from(new Set(bids.map((b) => b.supplierCountryCode)));
                const actionCount = bids.filter((b) => b.status === "action_required").length;
                const finalCount = bids.filter((b) => b.status === "final_round").length;
                const needAction = actionCount + finalCount;
                const mostSevere = bids
                  .slice()
                  .sort((a, b) => PRIORITY[a.status] - PRIORITY[b.status])[0].status;
                const latestUpdate = bids
                  .map((b) => new Date(b.updatedAt).getTime())
                  .reduce((a, b) => Math.max(a, b), 0);

                return (
                  <Fragment key={g.id}>
                    <tr
                      className={`nego-row-parent ${isOpen ? "is-open" : ""}`.trim()}
                      onClick={() => toggle(g.id)}
                    >
                      <td>
                        <div className="group-title">
                          <span className="chev"><ChevronRightIcon size={14} /></span>
                          <span>{g.title}</span>
                          <span className="bids-count">
                            {t("buyer.negotiations.bidsCount", { n: bids.length })}
                          </span>
                          <span className="bid-dots">
                            {bids.map((b) => (
                              <span
                                key={b.id}
                                className={
                                  b.status === "action_required" || b.status === "final_round"
                                    ? "dot"
                                    : "dot muted"
                                }
                              />
                            ))}
                          </span>
                          {g.oppWmsRef && <span className="opp-ref">{g.oppWmsRef}</span>}
                        </div>
                      </td>
                      <td>{sameRound ? `R${bids[0].round}/${bids[0].maxRounds}` : "···"}</td>
                      <td>{minBid === maxBid ? fmtUsd(minBid) : `${fmtUsd(minBid)} – ${fmtUsd(maxBid)}`}</td>
                      <td>
                        {minCnt == null || maxCnt == null
                          ? t("buyer.negotiations.awaiting", { defaultValue: "Aguardando" })
                          : minCnt === maxCnt
                            ? fmtUsd(minCnt)
                            : `${fmtUsd(minCnt)} – ${fmtUsd(maxCnt)}`}
                      </td>
                      <td>
                        <span className="nego-dest">
                          {countries.map((c) => (
                            <span key={c} className="nego-flag">{c}</span>
                          ))}
                        </span>
                      </td>
                      <td>
                        {needAction > 0 ? (
                          <span className="pill pill-action-required">
                            {t("buyer.negotiations.needAction", { n: needAction })}
                          </span>
                        ) : (
                          <span className={`pill ${STATUS_PILL[mostSevere]}`}>
                            {t(`buyer.negotiations.status.${mostSevere}`)}
                          </span>
                        )}
                      </td>
                      <td>{fmtDate(new Date(latestUpdate).toISOString(), locale)}</td>
                    </tr>
                    {bids.map((b) => (
                      <tr
                        key={b.id}
                        className={`nego-row-child ${isOpen ? "" : "hidden"}`.trim()}
                        onClick={() => navigate(`/buyer/negotiations/${b.id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <td data-label={t("buyer.negotiations.col.offerSupplier")}>
                          <div className="nego-buyer-cell">
                            <span className="nego-avatar">{b.supplierInitials}</span>
                            <div className="info">
                              <span className="name">{b.supplierName}</span>
                              {b.supplierContact && <span className="sub">{b.supplierContact}</span>}
                            </div>
                          </div>
                        </td>
                        <td data-label={t("buyer.negotiations.col.round")}>
                          <span className="nego-round">R{b.round}/{b.maxRounds}</span>
                        </td>
                        <td data-label={t("buyer.negotiations.col.yourBid")}>
                          <span className="nego-bid-amount">{fmtUsd(b.yourBidUsd)}</span>
                        </td>
                        <td data-label={t("buyer.negotiations.col.supplierCounter")}>
                          <span className="nego-counter-amount">
                            {b.supplierCounterUsd != null
                              ? fmtUsd(b.supplierCounterUsd)
                              : t("buyer.negotiations.awaiting", { defaultValue: "Aguardando" })}
                          </span>
                        </td>
                        <td data-label={t("buyer.negotiations.col.origin")}>
                          <span className="nego-dest">
                            <span className="nego-flag">{b.supplierCountryCode}</span>
                            {b.originPort}
                          </span>
                        </td>
                        <td data-label={t("buyer.negotiations.col.status")}>
                          <div className="nego-status-cell">
                            <span className={`pill ${STATUS_PILL[b.status]}`}>
                              {t(`buyer.negotiations.status.${b.status}`)}
                            </span>
                            {b.status === "action_required" && b.expiresIn && (
                              <span className="nego-timer">⏱ {b.expiresIn}</span>
                            )}
                            {b.status === "accepted" && b.orderNumber && (
                              <a
                                href={`/buyer/orders/${b.orderNumber}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: 11, color: "#8B2252", fontWeight: 500, textDecoration: "none" }}
                              >
                                Order #{b.orderNumber} →
                              </a>
                            )}
                          </div>
                        </td>
                        <td data-label={t("buyer.negotiations.col.updated")}>
                          {fmtDate(b.updatedAt, locale)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {groups.length > 0 && (
        <MobileBuyerNegoList
          groups={groups}
          tab={mobileTab}
          onTabChange={setMobileTab}
          locale={locale}
          navigate={navigate}
          t={t}
        />
      )}
    </>
  );
}

function MobileBuyerNegoList({
  groups,
  tab,
  onTabChange,
  locale,
  navigate,
  t,
}: {
  groups: (BuyerParentOffer & { _bids: BuyerNegotiationBid[] })[];
  tab: MobileTab;
  onTabChange: (v: MobileTab) => void;
  locale: string;
  navigate: ReturnType<typeof useNavigate>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const allBids = groups.flatMap((g) => g._bids);
  const counts = {
    needs_you: allBids.filter((b) => TAB_OF_STATUS[b.status] === "needs_you").length,
    waiting:   allBids.filter((b) => TAB_OF_STATUS[b.status] === "waiting").length,
    closed:    allBids.filter((b) => TAB_OF_STATUS[b.status] === "closed").length,
  };
  const visibleGroups = groups
    .map((g) => ({ ...g, _bids: g._bids.filter((b) => TAB_OF_STATUS[b.status] === tab) }))
    .filter((g) => g._bids.length > 0);

  return (
    <div className="mnc-active lg:hidden">
      <MobileNegoTabs<MobileTab>
        value={tab}
        onChange={onTabChange}
        options={[
          { key: "needs_you", label: t("buyer.negotiations.mobile.needsYou", { defaultValue: "Needs you" }), count: counts.needs_you },
          { key: "waiting",   label: t("buyer.negotiations.mobile.waiting",   { defaultValue: "Waiting" }),   count: counts.waiting },
          { key: "closed",    label: t("buyer.negotiations.mobile.closed",    { defaultValue: "Closed" }),    count: counts.closed },
        ]}
      />
      {visibleGroups.length === 0 ? (
        <div className="detail-empty"><p>{t("buyer.negotiations.empty")}</p></div>
      ) : (
        visibleGroups.map((g) => {
          const need = g._bids.filter(
            (b) => b.status === "action_required" || b.status === "final_round",
          ).length;
          return (
            <MobileNegoGroup
              key={g.id}
              title={g.title}
              refNumber={g.oppWmsRef}
              bidCount={g._bids.length}
              needActionLabel={
                need > 0
                  ? t("buyer.negotiations.needAction", {
                      n: need,
                      defaultValue: `${need} need action`,
                    })
                  : undefined
              }
            >
              {g._bids.map((b) => {
                const hasCnt = b.supplierCounterUsd != null;
                const gap = hasCnt ? (b.supplierCounterUsd as number) - b.yourBidUsd : null;
                return (
                  <MobileNegoBidCard
                    key={b.id}
                    initials={b.supplierInitials}
                    initialsTone={toneFor(b.supplierName)}
                    partyName={b.supplierName}
                    countryCode={b.supplierCountryCode}
                    subtitle={
                      <>
                        {b.originPort}
                        {b.supplierContact ? ` · ${b.supplierContact}` : ""}
                      </>
                    }
                    status={{
                      tone: STATUS_TONE[b.status],
                      label: t(`buyer.negotiations.status.${b.status}`),
                    }}
                    stats={[
                      { label: t("buyer.negotiations.col.yourBid"), value: fmtUsd(b.yourBidUsd), tone: "bid" },
                      {
                        label: t("buyer.negotiations.col.supplierCounter", { defaultValue: "Supplier counter" }),
                        value: hasCnt
                          ? fmtUsd(b.supplierCounterUsd as number)
                          : t("buyer.negotiations.awaiting", { defaultValue: "Aguardando" }),
                        tone: "counter",
                      },
                      {
                        label: t("buyer.negotiations.mobile.gap", { defaultValue: "Gap" }),
                        value: gap == null
                          ? "—"
                          : `${gap >= 0 ? "+" : ""}${fmtUsd(Math.abs(gap))}`,
                        tone: gap == null ? "counter" : gap >= 0 ? "gap-neg" : "gap-pos",
                      },
                    ]}
                    round={{ current: b.round, total: b.maxRounds }}
                    dateLabel={fmtDate(b.updatedAt, locale)}
                    timerLabel={b.status === "action_required" && b.expiresIn ? b.expiresIn : undefined}
                    onClick={() => navigate(`/buyer/negotiations/${b.id}`)}
                  />
                );
              })}
            </MobileNegoGroup>
          );
        })
      )}
    </div>
  );
}
