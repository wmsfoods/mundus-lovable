import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardIcon, SearchIcon, PlusIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { useBuyerRequests, type BuyerRequestStatus, type BuyerRequestRow } from "@/hooks/useBuyerRequests";
import { formatRequestNumber } from "@/lib/requestNumber";
import { supabase } from "@/integrations/supabase/client";

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

function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE").format(v);
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export default function BuyerRequests() {
  const navigate = useNavigate();
  const { data, counts, isLoading } = useBuyerRequests();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<"all" | BuyerRequestStatus>("all");
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

      <div className="data-table-wrap" style={{ marginTop: 12 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Product</th>
              <th>Destination</th>
              <th>Target $/kg</th>
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
                  <td>{r.target_price_usd != null ? `$${Number(r.target_price_usd).toFixed(2)}` : "—"}</td>
                  <td>{fmtKg(Number(r.quantity_kg))} kg</td>
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
    </>
  );
}