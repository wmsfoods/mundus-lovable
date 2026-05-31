import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardIcon, SearchIcon, PlusIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { useBuyerRequests, type BuyerRequestStatus, type BuyerRequestRow } from "@/hooks/useBuyerRequests";
import { formatRequestNumber } from "@/lib/requestNumber";
import { supabase } from "@/integrations/supabase/client";
import { useWeightUnit } from "@/contexts/WeightUnitContext";
import { fmtWeight, fmtPrice, weightLabel, priceLabel } from "@/lib/units";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";
import { NegotiationsFilterSheet } from "@/components/marketplace/NegotiationsFilterSheet";
import {
  MobileNegoBidCard,
  MobileNegoGroup,
  MobileNegoTabs,
  type MobileNegoStatusTone,
} from "@/components/negotiation/MobileNegotiationCard";

const STATUS_CHIP: Record<BuyerRequestStatus, string> = {
  new: "req-status-chip is-draft",
  with_responses: "req-status-chip is-active",
  offer_sent: "req-status-chip is-won",
  closed: "req-status-chip is-nowin",
  not_interested: "req-status-chip is-expired",
};

const STATUS_LABEL: Record<BuyerRequestStatus, string> = {
  new: "New",
  with_responses: "With responses",
  offer_sent: "Offer sent",
  closed: "Closed",
  not_interested: "Cancelled",
};

const STATUS_TONE: Record<BuyerRequestStatus, MobileNegoStatusTone> = {
  new: "awaiting",
  with_responses: "action_required",
  offer_sent: "accepted",
  closed: "rejected",
  not_interested: "expired",
};

type MobileTab = "needs_attention" | "waiting" | "closed";
const TAB_OF_STATUS: Record<BuyerRequestStatus, MobileTab> = {
  with_responses: "needs_attention",
  new: "waiting",
  offer_sent: "closed",
  closed: "closed",
  not_interested: "closed",
};

function initialsOf(s: string) {
  return (s || "?").trim().slice(0, 2).toUpperCase();
}

function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE").format(v);
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export default function BuyerRequests() {
  const navigate = useNavigate();
  const { data, counts, isLoading } = useBuyerRequests();
  const { unit } = useWeightUnit();
  const isMobile = useIsMobileShell();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<"all" | BuyerRequestStatus>("all");
  const [mobileTab, setMobileTab] = useState<MobileTab>("needs_attention");
  const [responseOffers, setResponseOffers] = useState<Array<{ id: string; request_id: string | null }>>([]);

  useEffect(() => {
    const ids = data.map((r) => r.id);
    if (ids.length === 0) { setResponseOffers([]); return; }
    let cancelled = false;
    (async () => {
      const { data: offers } = await supabase
        .from("offers")
        .select("id, request_id")
        .in("request_id", ids)
        .is("deleted_at", null);
      if (!cancelled) setResponseOffers((offers ?? []) as Array<{ id: string; request_id: string | null }>);
    })();
    return () => { cancelled = true; };
  }, [data]);

  const responsesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of responseOffers) {
      if (o.request_id) map[o.request_id] = (map[o.request_id] ?? 0) + 1;
    }
    return map;
  }, [responseOffers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (!q) return true;
      return `${formatRequestNumber(r.request_number, r.created_at)} ${r.product_name} ${r.destination_country} ${r.destination_port ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, statusF]);

  const chips: Array<{ key: "all" | BuyerRequestStatus; count: number; label: string }> = [
    { key: "all", count: counts.all, label: "All" },
    { key: "new", count: counts.new, label: STATUS_LABEL.new },
    { key: "with_responses", count: counts.with_responses, label: STATUS_LABEL.with_responses },
    { key: "offer_sent", count: counts.offer_sent, label: STATUS_LABEL.offer_sent },
    { key: "closed", count: counts.closed, label: STATUS_LABEL.closed },
    { key: "not_interested", count: counts.not_interested, label: STATUS_LABEL.not_interested },
  ];

  return (
    <>
      <Crumbs items={[{ label: "Home", to: "/buyer" }, { label: "My Requests" }]} />
      <PageTitle icon={ClipboardIcon} title="My Requests" />

      <NegotiationsFilterSheet
        query={search}
        onQueryChange={setSearch}
        sortBy="recent"
        onSortChange={() => {}}
        filter={statusF}
        onFilterChange={(v) => setStatusF(v as "all" | BuyerRequestStatus)}
        chips={chips.map((c) => ({ key: c.key, label: c.label, count: c.count }))}
        sortLabels={{ recent: "Recent", oldest: "Oldest", priority: "Priority" }}
        searchPlaceholder="Search by number, product, destination…"
        i18n={{
          filters: "Filters",
          sort: "Sort",
          status: "Status",
          clear: "Clear",
          cancel: "Cancel",
          apply: "Apply",
        }}
      />

      {!isMobile && (
      <>
      <div className="table-toolbar">
        <div className="left">
          <div className="search-input">
            <span className="ic"><SearchIcon size={16} /></span>
            <input
              type="text"
              placeholder="Search by number, product, destination…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="right">
          <button type="button" className="btn-tb is-primary" onClick={() => navigate("/buyer/requests/new")}>
            <PlusIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            New request
          </button>
        </div>
      </div>

      <div className="nego-chips" style={{ marginTop: 12 }}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`nego-chip ${statusF === c.key ? "is-active" : ""}`.trim()}
            onClick={() => setStatusF(c.key)}
          >
            {c.label}
            <span className="count">{c.count}</span>
          </button>
        ))}
      </div>
      </>
      )}

      <div className="data-table-wrap has-mobile-cards" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Product</th>
              <th>Destination</th>
              <th>Target {priceLabel(unit)}</th>
              <th>Volume</th>
              <th>Shipment</th>
              <th>Status</th>
              <th>Responses</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--fg-muted)" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--fg-muted)" }}>No requests yet.</td></tr>
            ) : (
              filtered.map((r: BuyerRequestRow) => (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/buyer/requests/${r.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{formatRequestNumber(r.request_number, r.created_at)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.product_name}</div>
                    {r.category && <div style={{ fontSize: "var(--fs-xs)", color: "var(--fg-muted)" }}>{r.category}</div>}
                  </td>
                  <td>
                    {r.destination_country}
                    {r.destination_port && <div style={{ fontSize: "var(--fs-xs)", color: "var(--fg-muted)" }}>{r.destination_port}</div>}
                  </td>
                  <td>{r.target_price_usd != null ? `$${fmtPrice(Number(r.target_price_usd), unit)}` : "—"}</td>
                  <td>{fmtWeight(Number(r.quantity_kg), unit)} {weightLabel(unit)}</td>
                  <td>{r.shipment_date ?? "—"}</td>
                  <td><span className={STATUS_CHIP[r.status]}>{STATUS_LABEL[r.status]}</span></td>
                  <td>
                    {(responsesMap[r.id] ?? 0) > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
                          padding: "3px 8px", borderRadius: 999,
                          background: "#dbeafe", color: "#1e40af",
                          fontSize: 10, fontWeight: 700,
                        }}>
                          📦 {responsesMap[r.id]} supplier{responsesMap[r.id] > 1 ? "s" : ""}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Waiting…</span>
                    )}
                  </td>
                  <td>{fmtDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MobileRequestsList
        items={filtered}
        responsesMap={responsesMap}
        unit={unit}
        tab={mobileTab}
        onTabChange={setMobileTab}
        onOpen={(id) => navigate(`/buyer/requests/${id}`)}
        onCreate={() => navigate("/buyer/requests/new")}
        isLoading={isLoading}
      />
    </>
  );
}

function MobileRequestsList({
  items,
  responsesMap,
  unit,
  tab,
  onTabChange,
  onOpen,
  onCreate,
  isLoading,
}: {
  items: BuyerRequestRow[];
  responsesMap: Record<string, number>;
  unit: ReturnType<typeof useWeightUnit>["unit"];
  tab: MobileTab;
  onTabChange: (v: MobileTab) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  isLoading: boolean;
}) {
  const counts = {
    needs_attention: items.filter((r) => TAB_OF_STATUS[r.status] === "needs_attention").length,
    waiting: items.filter((r) => TAB_OF_STATUS[r.status] === "waiting").length,
    closed: items.filter((r) => TAB_OF_STATUS[r.status] === "closed").length,
  };
  const visible = items.filter((r) => TAB_OF_STATUS[r.status] === tab);
  const groupTitle =
    tab === "needs_attention" ? "With responses" : tab === "waiting" ? "Waiting for suppliers" : "Closed";

  return (
    <div className="mnc-active lg:hidden">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button type="button" className="btn-tb is-primary" onClick={onCreate}>
          <PlusIcon size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          New request
        </button>
      </div>
      <MobileNegoTabs<MobileTab>
        value={tab}
        onChange={onTabChange}
        options={[
          { key: "needs_attention", label: "Needs attention", count: counts.needs_attention },
          { key: "waiting", label: "Waiting", count: counts.waiting },
          { key: "closed", label: "Closed", count: counts.closed },
        ]}
      />
      {isLoading ? (
        <div className="detail-empty"><p>Loading…</p></div>
      ) : visible.length === 0 ? (
        <div className="detail-empty"><p>No requests in this tab.</p></div>
      ) : (
        <MobileNegoGroup title={groupTitle} bidCount={visible.length}>
          {visible.map((r) => {
            const responses = responsesMap[r.id] ?? 0;
            return (
              <MobileNegoBidCard
                key={r.id}
                initials={initialsOf(r.product_name)}
                partyName={formatRequestNumber(r.request_number, r.created_at)}
                subtitle={
                  <>
                    {r.product_name}
                    {r.destination_country ? ` · ${r.destination_country}${r.destination_port ? ` (${r.destination_port})` : ""}` : ""}
                  </>
                }
                status={{ tone: STATUS_TONE[r.status], label: STATUS_LABEL[r.status] }}
                stats={[
                  { label: "Volume", value: `${fmtWeight(Number(r.quantity_kg), unit)} ${weightLabel(unit)}` },
                  { label: `Target ${priceLabel(unit)}`, value: r.target_price_usd != null ? `$${fmtPrice(Number(r.target_price_usd), unit)}` : "—", tone: "bid" },
                  { label: "Responses", value: responses > 0 ? `${responses} supplier${responses > 1 ? "s" : ""}` : "—", tone: responses > 0 ? "counter" : "default" },
                ]}
                dateLabel={fmtDate(r.created_at)}
                onClick={() => onOpen(r.id)}
              />
            );
          })}
        </MobileNegoGroup>
      )}
    </div>
  );
}