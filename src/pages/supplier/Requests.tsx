import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardIcon, SearchIcon } from "@/components/icons";
import { Crumbs } from "@/components/mundus/Crumbs";
import { PageTitle } from "@/components/mundus/PageTitle";
import { Pagination } from "@/components/mundus/Pagination";
import { ListCard, ListCardList } from "@/components/mundus/ListCard";
import { supabase } from "@/integrations/supabase/client";
import { formatRequestNumber } from "@/lib/requestNumber";
import type { BuyerRequestRow } from "@/hooks/useBuyerRequests";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { useCutImages, CutThumb } from "@/hooks/useCutImages";
import { useFamilyContext } from "@/hooks/useFamilyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 10;

type Row = BuyerRequestRow & { buyer_company_name?: string | null };
type FamilyOffice = { id: string; name: string; office_name?: string | null };

type MyOffer = {
  id: string;
  offer_number: number | null;
  request_id: string | null;
  status: string | null;
  created_at: string;
};
type MyNeg = { id: string; offer_id: string; status: string };
type ResponseInfo = { offers: MyOffer[]; negotiations: MyNeg[] };

function fmtKg(v: number) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(v);
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export default function SupplierRequests() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { company } = useCurrentCompany();
  const { user } = useAuth();
  const fam = useFamilyContext();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [myOffers, setMyOffers] = useState<MyOffer[]>([]);
  const [myNegs, setMyNegs] = useState<MyNeg[]>([]);
  const [inboxTab, setInboxTab] = useState<"unassigned" | "assigned">("unassigned");
  const [familyOffices, setFamilyOffices] = useState<FamilyOffice[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);

  const showHqInbox = fam.isFamilyHq && fam.isHqLevelUser;

  useEffect(() => {
    if (!showHqInbox || !fam.familyRootId) { setFamilyOffices([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("companies")
        .select("id, name, office_name")
        .eq("parent_company_id", fam.familyRootId);
      if (!cancelled) setFamilyOffices((data ?? []) as FamilyOffice[]);
    })();
    return () => { cancelled = true; };
  }, [showHqInbox, fam.familyRootId]);

  useEffect(() => {
    if (!company?.id || fam.loading) return;
    let cancelled = false;
    (async () => {
      let query = supabase
        .from("buyer_requests")
        .select("*")
        .in("status", ["new", "with_responses", "not_interested"])
        .is("deleted_at", null);
      if (showHqInbox && fam.familyRootId) {
        const officeFilter = fam.familyOfficeIds.length
          ? `,assigned_office_id.in.(${fam.familyOfficeIds.join(",")})`
          : "";
        query = query.or(
          `target_supplier_id.eq.${fam.familyRootId},target_supplier_id.is.null${officeFilter}`,
        );
      } else if (fam.isFamilyHq && fam.isOfficeOperator) {
        // Office operator: only assigned to my office(s)
        const officeIds = fam.familyOfficeIds.filter((id) => id === company.id);
        const ids = officeIds.length ? officeIds : [company.id];
        query = query.in("assigned_office_id", ids);
      } else {
        // Single-office supplier — today's behavior
        query = query.or(`target_supplier_id.is.null,target_supplier_id.eq.${company.id}`);
      }
      const { data: reqs } = await query.order("created_at", { ascending: false });
      const list = (reqs ?? []) as unknown as BuyerRequestRow[];
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
  }, [company?.id, fam.loading, fam.isFamilyHq, fam.isOfficeOperator, fam.familyRootId, fam.familyOfficeIds.join(","), showHqInbox]);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    (async () => {
      const { data: offers } = await supabase
        .from("offers")
        .select("id, offer_number, request_id, status, created_at")
        .eq("supplier_id", company.id)
        .not("request_id", "is", null)
        .is("deleted_at", null);
      if (cancelled) return;
      const list = (offers ?? []) as MyOffer[];
      setMyOffers(list);
      const ids = list.map((o) => o.id);
      if (ids.length) {
        const { data: negs } = await supabase
          .from("negotiations")
          .select("id, offer_id, status")
          .in("offer_id", ids)
          .is("deleted_at", null);
        if (!cancelled) setMyNegs((negs ?? []) as MyNeg[]);
      } else {
        setMyNegs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [company?.id]);

  const responseMap = useMemo(() => {
    const map: Record<string, ResponseInfo> = {};
    for (const o of myOffers) {
      if (!o.request_id) continue;
      if (!map[o.request_id]) map[o.request_id] = { offers: [], negotiations: [] };
      map[o.request_id].offers.push(o);
    }
    for (const n of myNegs) {
      for (const key of Object.keys(map)) {
        if (map[key].offers.some((o) => o.id === n.offer_id)) {
          map[key].negotiations.push(n);
        }
      }
    }
    return map;
  }, [myOffers, myNegs]);

  const visible = useMemo(() => rows.filter((r) => !dismissed.has(r.id)), [rows, dismissed]);
  const tabFiltered = useMemo(() => {
    if (!showHqInbox) return visible;
    return visible.filter((r) => (r as any).routing_status === inboxTab);
  }, [visible, showHqInbox, inboxTab]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((r) =>
      `${formatRequestNumber(r.request_number, r.created_at)} ${r.buyer_company_name ?? ""} ${r.product_name} ${r.destination_country}`
        .toLowerCase().includes(q)
    );
  }, [tabFiltered, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const to = Math.min(pageSafe * PAGE_SIZE, total);
  const slice = filtered.slice(from === 0 ? 0 : from - 1, to);
  const cutImgs = useCutImages(slice.map((r) => r.product_name));

  const handleAssign = async (requestId: string, officeId: string) => {
    if (!user?.id) return;
    setAssigning(requestId);
    try {
      const { data, error } = await (supabase as any).rpc("assign_request_to_office", {
        p_request_id: requestId,
        p_office_id: officeId,
        p_user_id: user.id,
      });
      if (error) throw error;
      toast({
        title: t("supplier.multiOffice.requests.assignedToast"),
        description: t("supplier.multiOffice.requests.assignedToastDesc"),
      });
      setRows((rs) => rs.map((r) => r.id === requestId
        ? ({ ...r, routing_status: "assigned", assigned_office_id: officeId, assigned_at: new Date().toISOString() } as any)
        : r));
    } catch (e: any) {
      toast({
        title: t("supplier.multiOffice.requests.assignError"),
        description: e?.message ?? t("supplier.multiOffice.requests.assignErrorUnknown"),
        variant: "destructive",
      });
    } finally {
      setAssigning(null);
    }
  };

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

      {showHqInbox && (
        <div className="table-toolbar" style={{ paddingBottom: 0 }}>
          <div className="left" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["unassigned", "assigned"] as const).map((tab) => {
              const count = visible.filter((r) => (r as any).routing_status === tab).length;
              const active = inboxTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  className="btn-tb"
                  onClick={() => { setInboxTab(tab); setPage(1); }}
                  style={{
                    background: active ? "var(--brand)" : "transparent",
                    color: active ? "#fff" : "var(--fg)",
                    borderColor: active ? "var(--brand)" : "var(--border)",
                    textTransform: "capitalize",
                  }}
                >
                  {tab === "unassigned"
                    ? t("supplier.multiOffice.requests.tabUnassigned")
                    : t("supplier.multiOffice.requests.tabAssigned")} · {count}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
              <th>Responses</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-row"><td colSpan={10}>Loading…</td></tr>
            ) : slice.length === 0 ? (
              <tr className="empty-row"><td colSpan={10}>No active requests right now.</td></tr>
            ) : slice.map((r) => {
              const resp = responseMap[r.id];
              const acceptedNeg = resp?.negotiations.find((n) => n.status === "bid_accepted");
              const withdrawn = r.status === "not_interested";
              const routingStatus = (r as any).routing_status as string | undefined;
              const assignedOfficeId = (r as any).assigned_office_id as string | undefined;
              const assignedOffice = familyOffices.find((o) => o.id === assignedOfficeId);
              return (
              <tr key={r.id}>
                <td>
                  <button type="button" className="link-action" onClick={() => navigate(`/supplier/requests/${r.id}`)}>
                    {formatRequestNumber(r.request_number, r.created_at)}
                  </button>
                  {r.target_supplier_id && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 999,
                        background: "#dbeafe", color: "#1e40af",
                        fontSize: 10, fontWeight: 700,
                      }}>
                        🎯 Direct request
                      </span>
                    </div>
                  )}
                  {showHqInbox && routingStatus === "assigned" && assignedOffice && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 999,
                        background: "#ecfeff", color: "#0e7490",
                        fontSize: 10, fontWeight: 700,
                      }}>
                        🏢 {assignedOffice.office_name || assignedOffice.name}
                      </span>
                    </div>
                  )}
                  {withdrawn && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 999,
                        background: "#fee2e2", color: "#dc2626",
                        fontSize: 10, fontWeight: 700,
                      }}>
                        ⚠️ Buyer withdrew
                      </span>
                    </div>
                  )}
                </td>
                <td>{r.buyer_company_name ?? "—"}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <CutThumb src={cutImgs[r.product_name]} />
                    {r.product_name}
                  </span>
                </td>
                <td>{r.destination_country}{r.destination_port ? ` · ${r.destination_port}` : ""}</td>
                <td>{r.incoterm ?? "—"}</td>
                <td>{fmtKg(Number(r.quantity_kg))} kg</td>
                <td>{r.container_size ?? "—"} ({r.container_count ?? 1})</td>
                <td>{fmtDate(r.created_at)}</td>
                <td>
                  {resp ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
                        padding: "3px 8px", borderRadius: 999,
                        background: "#dcfce7", color: "#166534",
                        fontSize: 10, fontWeight: 700,
                      }}>
                        ✓ You responded ({resp.offers.length})
                      </span>
                      {resp.negotiations.length > 0 && (
                        <span style={{ fontSize: 10, color: acceptedNeg ? "#166534" : "#0d9488" }}>
                          {acceptedNeg ? "🎉 Deal closed!" : `💬 ${resp.negotiations.length} negotiation(s)`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>—</span>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {showHqInbox && routingStatus === "unassigned" && familyOffices.length > 0 && (
                      <select
                        className="btn-tb"
                        value=""
                        disabled={assigning === r.id}
                        onChange={(e) => e.target.value && handleAssign(r.id, e.target.value)}
                        style={{ minWidth: 160 }}
                      >
                        <option value="">
                          {assigning === r.id ? "Assigning…" : "Assign to office ▾"}
                        </option>
                        {familyOffices.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.office_name || o.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {withdrawn ? (
                      resp ? (
                        <button type="button" className="btn-tb" onClick={() => navigate(`/supplier/offers/${resp.offers[0].id}`)}>
                          View your offer →
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Withdrawn</span>
                      )
                    ) : resp ? (
                      <>
                        <button type="button" className="btn-tb is-primary"
                          onClick={() => navigate(`/supplier/offers/${resp.offers[0].id}`)}>
                          View your offer →
                        </button>
                        <button type="button" className="btn-tb" onClick={() => handleCreateOffer(r)}>
                          + Another offer
                        </button>
                      </>
                    ) : (
                      <>
                        {!(showHqInbox && routingStatus === "unassigned") && (
                          <button type="button" className="btn-tb is-primary" onClick={() => handleCreateOffer(r)}>
                            Create Offer
                          </button>
                        )}
                        <button type="button" className="btn-tb" onClick={() => setDismissed((s) => new Set(s).add(r.id))}>
                          Not interested
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ListCardList>
        {slice.length === 0 ? (
          <div className="empty-state">{loading ? "Loading…" : "No active requests."}</div>
        ) : slice.map((r) => {
          const resp = responseMap[r.id];
          const acceptedNeg = resp?.negotiations.find((n) => n.status === "bid_accepted");
          return (
            <ListCard
            key={r.id}
            onClick={() => navigate(`/supplier/requests/${r.id}`)}
            title={<span style={{ display: "inline-flex", alignItems: "center" }}><CutThumb src={cutImgs[r.product_name]} />{r.product_name}</span>}
            subtitle={`${formatRequestNumber(r.request_number, r.created_at)} · ${r.buyer_company_name ?? "Buyer"}`}
            meta={[
              { label: "Destination", value: r.destination_country },
              { label: "Incoterm", value: r.incoterm ?? "—" },
              { label: "Quantity", value: `${fmtKg(Number(r.quantity_kg))} kg` },
              { label: "Container", value: `${r.container_size ?? "—"} (${r.container_count ?? 1})` },
              { label: "Responses", value: resp ? (acceptedNeg ? "🎉 Deal closed" : `✓ You responded (${resp.offers.length})`) : "—" },
            ]}
            />
          );
        })}
      </ListCardList>

      <div className="table-footer">
        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>
    </>
  );
}