import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardIcon, SearchIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { Pagination } from "@/components/mundus/Pagination";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import { supabase } from "@/integrations/supabase/client";
import { formatRequestNumber } from "@/lib/requestNumber";
import type { BuyerRequestRow } from "@/hooks/useBuyerRequests";

const PAGE_SIZE = 10;

type Row = BuyerRequestRow & { buyer_company_name?: string | null };

function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(v);
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export default function SupplierRequests() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: reqs } = await supabase
        .from("buyer_requests")
        .select("*")
        .in("status", ["new", "with_responses"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      const list = (reqs ?? []) as BuyerRequestRow[];
      const companyIds = Array.from(new Set(list.map((r) => r.buyer_company_id)));
      let companyMap = new Map<string, string>();
      if (companyIds.length) {
        const { data: cos } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);
        companyMap = new Map((cos ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
      }
      if (cancelled) return;
      setRows(list.map((r) => ({ ...r, buyer_company_name: companyMap.get(r.buyer_company_id) ?? null })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => rows.filter((r) => !dismissed.has(r.id)), [rows, dismissed]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((r) =>
      `${formatRequestNumber(r.request_number, r.created_at)} ${r.buyer_company_name ?? ""} ${r.product_name} ${r.destination_country}`
        .toLowerCase().includes(q)
    );
  }, [visible, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, total);
  const slice = filtered.slice(from === 0 ? 0 : from - 1, to);

  const handleCreateOffer = (r: Row) => {
    navigate(`/supplier/offers/new?from=${r.id}`, {
      state: {
        fromRequest: {
          requestId: r.id,
          requestNumber: formatRequestNumber(r.request_number, r.created_at),
          client: r.buyer_company_name ?? "Buyer",
          product: r.product_name,
          category: r.category ?? "",
          specification: r.specification ?? "",
          quantity: Number(r.quantity_kg),
          targetPrice: r.target_price_usd != null ? Number(r.target_price_usd) : 0,
          destinationCountry: r.destination_country,
          destinationPort: r.destination_port ?? "",
          incoterms: r.incoterm ?? "",
          containerSize: r.container_size ?? "40ft",
          containerCount: r.container_count ?? 1,
          temperature: r.temperature ?? "Frozen",
          shipmentDate: r.shipment_date ?? "",
          additionalInfo: r.additional_info ?? "",
        },
      },
    });
  };

  return (
    <>
      <Crumbs items={[{ label: "Home", to: "/supplier" }, { label: "Requests" }]} />
      <PageTitle icon={ClipboardIcon} title="Buyer Requests" subtitle="Active requests from buyers — create an offer to respond." />

      <div className="table-toolbar">
        <div className="left">
          <div className="search-input">
            <span className="ic"><SearchIcon size={16} /></span>
            <input
              placeholder="Search requests…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div className="right">
          <span className="result-count">Showing {from}-{to} of {total}</span>
        </div>
      </div>

      <div className="data-table-wrap has-mobile-cards">
        <table className="data-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Buyer</th>
              <th>Product</th>
              <th>Destination</th>
              <th>Incoterm</th>
              <th>Quantity</th>
              <th>Container</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={9}>Loading…</td></tr>
            ) : slice.length === 0 ? (
              <tr className="empty-row"><td colSpan={9}>No active requests right now.</td></tr>
            ) : slice.map((r) => (
              <tr key={r.id}>
                <td>
                  <button type="button" className="link-action" onClick={() => navigate(`/supplier/requests/${r.id}`)}>
                    {formatRequestNumber(r.request_number, r.created_at)}
                  </button>
                </td>
                <td>{r.buyer_company_name ?? "—"}</td>
                <td>{r.product_name}</td>
                <td>{r.destination_country}{r.destination_port ? ` · ${r.destination_port}` : ""}</td>
                <td>{r.incoterm ?? "—"}</td>
                <td>{fmtKg(Number(r.quantity_kg))} kg</td>
                <td>{r.container_size ?? "—"} ({r.container_count ?? 1})</td>
                <td>{fmtDate(r.created_at)}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn-tb is-primary" onClick={() => handleCreateOffer(r)}>
                      Create Offer
                    </button>
                    <button type="button" className="btn-tb" onClick={() => setDismissed((s) => new Set(s).add(r.id))}>
                      Not interested
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListCardList>
        {slice.length === 0 ? (
          <div className="empty-state">{loading ? "Loading…" : "No active requests."}</div>
        ) : slice.map((r) => (
          <ListCard
            key={r.id}
            onClick={() => navigate(`/supplier/requests/${r.id}`)}
            title={r.product_name}
            subtitle={`${formatRequestNumber(r.request_number, r.created_at)} · ${r.buyer_company_name ?? "Buyer"}`}
            meta={[
              { label: "Destination", value: r.destination_country },
              { label: "Incoterm", value: r.incoterm ?? "—" },
              { label: "Quantity", value: `${fmtKg(Number(r.quantity_kg))} kg` },
              { label: "Container", value: `${r.container_size ?? "—"} (${r.container_count ?? 1})` },
            ]}
          />
        ))}
      </ListCardList>

      <div className="table-footer">
        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>
    </>
  );
}