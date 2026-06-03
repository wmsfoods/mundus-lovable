import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageIcon, SearchIcon, ChevronRightIcon } from "@/components/icons";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { OfficeIndicator } from "@/components/mundus/OfficeIndicator";
import { NegotiationsFilterSheet } from "@/components/marketplace/NegotiationsFilterSheet";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import {
  MobileNegoBidCard,
  MobileNegoGroup,
  MobileNegoTabs,
  type MobileNegoStatusTone,
} from "@/components/negotiation/MobileNegotiationCard";
import {
  useNegotiations,
  type NegotiationBid,
  type NegotiationStatus,
  type ParentOffer,
} from "@/hooks/useNegotiations";

type Filter = NegotiationStatus | "all";
type SortKey = "recent" | "oldest" | "priority";
type MobileTab = "needs_you" | "waiting" | "closed";

const TAB_OF_STATUS: Record<NegotiationStatus, MobileTab> = {
  action_required: "needs_you",
  final_round: "needs_you",
  awaiting_buyer: "waiting",
  accepted: "closed",
  rejected: "closed",
  expired: "closed",
};

const STATUS_TONE: Record<NegotiationStatus, MobileNegoStatusTone> = {
  action_required: "action_required",
  awaiting_buyer: "awaiting",
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

const STATUS_PILL: Record<NegotiationStatus, string> = {
  action_required: "pill-action-required",
  awaiting_buyer: "pill-awaiting-buyer",
  final_round: "pill-final-round",
  accepted: "pill-deal-closed",
  rejected: "pill-rejected-nego",
  expired: "pill-expired",
};

const PRIORITY: Record<NegotiationStatus, number> = {
  action_required: 0,
  final_round: 1,
  awaiting_buyer: 2,
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

export default function SupplierNegotiations() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: offers, offerCount, bidCount, isLoading, error } = useNegotiations();
  const locale = i18n.language || "en";
  const isMobile = useIsMobileShell();

  // Negotiation IDs that have at least one share token (email relay enabled).
  const [tokenSet, setTokenSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("negotiation_tokens")
        .select("negotiation_id");
      if (cancelled || !data) return;
      setTokenSet(new Set(data.map((r) => r.negotiation_id as string)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(offers.map((o) => [o.id, true])),
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("needs_you");

  const allBids = useMemo(
    () => offers.flatMap((p) => p.bids.map((b) => ({ ...b, parentTitle: p.title, oppWmsRef: p.oppWmsRef }))),
    [offers],
  );

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: allBids.length,
      action_required: 0, awaiting_buyer: 0, final_round: 0,
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
      const hay = `${b.id} ${b.buyerName} ${b.parentTitle} ${b.destinationCountry} ${b.destinationPort}`.toLowerCase();
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
    const map = new Map<string, ParentOffer & { _bids: NegotiationBid[] }>();
    for (const o of offers) map.set(o.id, { ...o, _bids: [] });
    for (const b of filteredAndSortedBids) {
      const g = map.get(b.parentOfferId);
      if (g) g._bids.push(b);
    }
    return Array.from(map.values()).filter((g) => g._bids.length > 0);
  }, [offers, filteredAndSortedBids]);

  const toggle = (id: string) => setOpenGroups((p) => ({ ...p, [id]: !p[id] }));

  const CHIPS: { key: Filter; label: string }[] = [
    { key: "all", label: t("supplier.negotiations.chips.all") },
    { key: "action_required", label: t("supplier.negotiations.chips.action_required") },
    { key: "awaiting_buyer", label: t("supplier.negotiations.chips.awaiting_buyer") },
    { key: "final_round", label: t("supplier.negotiations.chips.final_round") },
    { key: "accepted", label: t("supplier.negotiations.chips.accepted") },
    { key: "rejected", label: t("supplier.negotiations.chips.rejected") },
    { key: "expired", label: t("supplier.negotiations.chips.expired") },
  ];

  return (
    <>
      <Crumbs
        items={[
          { label: t("shell.nav.home"), to: "/supplier" },
          { label: t("supplier.negotiations.title") },
        ]}
      />

      <PageTitle icon={MessageIcon} title={t("supplier.negotiations.title")} />

      <OfficeIndicator />

      <NegotiationsFilterSheet
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortChange={(v) => setSortBy(v as SortKey)}
        filter={filter}
        onFilterChange={(v) => setFilter(v as Filter)}
        chips={CHIPS.map((c) => ({ key: c.key, label: c.label, count: counts[c.key] }))}
        sortLabels={{
          recent: t("supplier.negotiations.sort.recent"),
          oldest: t("supplier.negotiations.sort.oldest"),
          priority: t("supplier.negotiations.sort.priority"),
        }}
        searchPlaceholder={t("supplier.negotiations.searchPlaceholder")}
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
            placeholder={t("supplier.negotiations.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="mini-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
        >
          <option value="recent">{t("supplier.negotiations.sort.recent")}</option>
          <option value="oldest">{t("supplier.negotiations.sort.oldest")}</option>
          <option value="priority">{t("supplier.negotiations.sort.priority")}</option>
        </select>
        <span className="nego-counts">
          {t("supplier.negotiations.counts", { offers: offerCount, bids: bidCount })}
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
          <p>{t("supplier.negotiations.empty")}</p>
        </div>
      ) : (
        <div className="data-table-wrap has-mobile-cards">
          <table className="nego-table">
            <thead>
              <tr>
                <th>{t("supplier.negotiations.col.offerBuyer")}</th>
                <th>{t("supplier.negotiations.col.round")}</th>
                <th>{t("supplier.negotiations.col.latestBid")}</th>
                <th>{t("supplier.negotiations.col.yourCounter")}</th>
                <th>{t("supplier.negotiations.col.destination")}</th>
                <th>{t("supplier.negotiations.col.status")}</th>
                <th>{t("supplier.negotiations.col.updated")}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const isOpen = openGroups[g.id] !== false;
                const bids = g._bids;
                const rounds = new Set(bids.map((b) => b.round));
                const sameRound = rounds.size === 1;
                const bidVals = bids.map((b) => b.latestBidUsd);
                const cntVals = bids
                  .map((b) => b.yourCounterUsd)
                  .filter((v): v is number => v != null);
                const minBid = Math.min(...bidVals);
                const maxBid = Math.max(...bidVals);
                const minCnt = cntVals.length ? Math.min(...cntVals) : null;
                const maxCnt = cntVals.length ? Math.max(...cntVals) : null;
                const countries = Array.from(new Set(bids.map((b) => b.buyerCountryCode)));
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
                            {t("supplier.negotiations.bidsCount", { n: bids.length })}
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
                      <td>
                        {sameRound ? `R${bids[0].round}/${bids[0].maxRounds}` : "···"}
                      </td>
                      <td>
                        {minBid === maxBid ? fmtUsd(minBid) : `${fmtUsd(minBid)} – ${fmtUsd(maxBid)}`}
                      </td>
                      <td>
                        {minCnt == null || maxCnt == null
                          ? t("supplier.negotiations.awaiting", { defaultValue: "Aguardando" })
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
                            {t("supplier.negotiations.needAction", { n: needAction })}
                          </span>
                        ) : (
                          <span className={`pill ${STATUS_PILL[mostSevere]}`}>
                            {t(`supplier.negotiations.status.${mostSevere}`)}
                          </span>
                        )}
                      </td>
                      <td>{fmtDate(new Date(latestUpdate).toISOString(), locale)}</td>
                    </tr>
                    {bids.map((b) => (
                      <tr
                        key={b.id}
                        className={`nego-row-child ${isOpen ? "" : "hidden"}`.trim()}
                        onClick={() => navigate(`/supplier/negotiations/${b.id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <td data-label={t("supplier.negotiations.col.offerBuyer")}>
                          <div className="nego-buyer-cell">
                            <span className="nego-avatar">{b.buyerInitials}</span>
                            <div className="info">
                              <span className="name">{b.buyerName}</span>
                              {b.buyerContact && <span className="sub">{b.buyerContact}</span>}
                            </div>
                          </div>
                        </td>
                        <td data-label={t("supplier.negotiations.col.round")}>
                          <span className="nego-round">R{b.round}/{b.maxRounds}</span>
                        </td>
                        <td data-label={t("supplier.negotiations.col.latestBid")}>
                          <span className="nego-bid-amount">{fmtUsd(b.latestBidUsd)}</span>
                        </td>
                        <td data-label={t("supplier.negotiations.col.yourCounter")}>
                          <span className="nego-counter-amount">
                            {b.yourCounterUsd != null
                              ? fmtUsd(b.yourCounterUsd)
                              : t("supplier.negotiations.awaiting", { defaultValue: "Aguardando" })}
                          </span>
                        </td>
                        <td data-label={t("supplier.negotiations.col.destination")}>
                          <span className="nego-dest">
                            <span className="nego-flag">{b.buyerCountryCode}</span>
                            {b.destinationPort}
                          </span>
                        </td>
                        <td data-label={t("supplier.negotiations.col.status")}>
                          <div className="nego-status-cell">
                            <span className={`pill ${STATUS_PILL[b.status]}`}>
                              {t(`supplier.negotiations.status.${b.status}`)}
                            </span>
                            {b.status === "action_required" && b.expiresIn && (
                              <span className="nego-timer">⏱ {b.expiresIn}</span>
                            )}
                            {tokenSet.has(b.id) && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(139,34,82,0.12)", color: "#8B2252" }}
                                title={t("supplier.negotiations.emailSentTooltip")}
                              >
                                <Mail size={10} /> {t("supplier.negotiations.emailSent")}
                              </span>
                            )}
                            {b.status === "accepted" && b.orderNumber && (
                              <a
                                href={`/supplier/sales/${b.orderNumber}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: 11, color: "#8B2252", fontWeight: 500, textDecoration: "none" }}
                              >
                                Order #{b.orderNumber} →
                              </a>
                            )}
                          </div>
                        </td>
                        <td data-label={t("supplier.negotiations.col.updated")}>
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
        <MobileNegoList
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

function MobileNegoList({
  groups,
  tab,
  onTabChange,
  locale,
  navigate,
  t,
}: {
  groups: (ParentOffer & { _bids: NegotiationBid[] })[];
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
          { key: "needs_you", label: t("supplier.negotiations.mobile.needsYou", { defaultValue: "Needs you" }), count: counts.needs_you },
          { key: "waiting",   label: t("supplier.negotiations.mobile.waiting",   { defaultValue: "Waiting" }),   count: counts.waiting },
          { key: "closed",    label: t("supplier.negotiations.mobile.closed",    { defaultValue: "Closed" }),    count: counts.closed },
        ]}
      />
      {visibleGroups.length === 0 ? (
        <div className="detail-empty"><p>{t("supplier.negotiations.empty")}</p></div>
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
                  ? t("supplier.negotiations.needAction", {
                      n: need,
                      defaultValue: `${need} need action`,
                    })
                  : undefined
              }
            >
              {g._bids.map((b) => {
                const hasCnt = b.yourCounterUsd != null;
                const gap = hasCnt ? (b.yourCounterUsd as number) - b.latestBidUsd : null;
                return (
                  <MobileNegoBidCard
                    key={b.id}
                    initials={b.buyerInitials}
                    initialsTone={toneFor(b.buyerName)}
                    partyName={b.buyerName}
                    countryCode={b.buyerCountryCode}
                    subtitle={
                      <>
                        {b.destinationPort}
                        {b.buyerContact ? ` · ${b.buyerContact}` : ""}
                      </>
                    }
                    status={{
                      tone: STATUS_TONE[b.status],
                      label: t(`supplier.negotiations.status.${b.status}`),
                    }}
                    stats={[
                      { label: t("supplier.negotiations.col.latestBid"), value: fmtUsd(b.latestBidUsd), tone: "bid" },
                      {
                        label: t("supplier.negotiations.col.yourCounter"),
                        value: hasCnt
                          ? fmtUsd(b.yourCounterUsd as number)
                          : t("supplier.negotiations.awaiting", { defaultValue: "Aguardando" }),
                        tone: "counter",
                      },
                      {
                        label: t("supplier.negotiations.mobile.gap", { defaultValue: "Gap" }),
                        value: gap == null
                          ? "—"
                          : `${gap >= 0 ? "+" : ""}${fmtUsd(Math.abs(gap))}`,
                        tone: gap == null ? "counter" : gap >= 0 ? "gap-pos" : "gap-neg",
                      },
                    ]}
                    round={{ current: b.round, total: b.maxRounds }}
                    dateLabel={fmtDate(b.updatedAt, locale)}
                    timerLabel={b.status === "action_required" && b.expiresIn ? b.expiresIn : undefined}
                    onClick={() => navigate(`/supplier/negotiations/${b.id}`)}
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