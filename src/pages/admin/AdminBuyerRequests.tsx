import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Home, Inbox, Search as SearchIcon, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRequestNumber } from "@/lib/requestNumber";
import { cn } from "@/lib/utils";

const WINE = "#8B2252";

type RequestRow = {
  id: string;
  request_number: number;
  product_name: string;
  category: string | null;
  destination_country: string;
  quantity_kg: number;
  status: string;
  created_at: string;
  buyer_company_id: string;
  buyer_company_name?: string | null;
  linked_offers?: Array<{ id: string; offer_number: number | null; supplier_name: string | null; status: string | null }>;
};

type ManagedSupplier = { id: string; name: string; country: string | null; logo_url: string | null };
type ManagedBuyer = { id: string; name: string; country: string | null; logo_url: string | null };

type Filter = "all" | "new" | "with_responses" | "offer_sent" | "closed";

function fmtKg(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    new: { label: "New", cls: "bg-blue-100 text-blue-800 border-blue-200" },
    with_responses: { label: "With responses", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    offer_sent: { label: "Offer sent", cls: "bg-green-100 text-green-800 border-green-200" },
    closed: { label: "Closed", cls: "bg-gray-100 text-gray-700 border-gray-200" },
    not_interested: { label: "Not interested", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", s.cls)}>
      {s.label}
    </span>
  );
}

export default function AdminBuyerRequests() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [managedSuppliers, setManagedSuppliers] = useState<ManagedSupplier[]>([]);
  const [managedBuyers, setManagedBuyers] = useState<ManagedBuyer[]>([]);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [pickerRequest, setPickerRequest] = useState<RequestRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: reqs }, { data: suppliers }] = await Promise.all([
        supabase
          .from("buyer_requests")
          .select("id, request_number, product_name, category, destination_country, quantity_kg, status, created_at, buyer_company_id")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("companies")
          .select("id, name, country, logo_url")
          .eq("mundus_managed_supplier", true)
          .eq("is_supplier", true)
          .is("deleted_at", null)
          .order("name"),
      ]);

      const { data: buyers } = await supabase
        .from("companies")
        .select("id, name, country, logo_url")
        .eq("mundus_managed_buyer", true)
        .eq("is_buyer", true)
        .is("deleted_at", null)
        .order("name");

      const list = (reqs ?? []) as RequestRow[];
      const buyerIds = Array.from(new Set(list.map((r) => r.buyer_company_id)));
      const reqIds = list.map((r) => r.id);

      const [{ data: buyersForRows }, { data: linkedOffers }] = await Promise.all([
        buyerIds.length
          ? supabase.from("companies").select("id, name").in("id", buyerIds)
          : Promise.resolve({ data: [] as any[] }),
        reqIds.length
          ? supabase
              .from("offers")
              .select("id, offer_number, supplier_name, status, request_id")
              .in("request_id", reqIds)
              .is("deleted_at", null)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const buyerMap = new Map((buyersForRows ?? []).map((b: any) => [b.id, b.name]));
      const offerMap = new Map<string, RequestRow["linked_offers"]>();
      (linkedOffers ?? []).forEach((o: any) => {
        const arr = offerMap.get(o.request_id) ?? [];
        arr!.push({ id: o.id, offer_number: o.offer_number, supplier_name: o.supplier_name, status: o.status });
        offerMap.set(o.request_id, arr);
      });

      if (cancelled) return;
      setRows(
        list.map((r) => ({
          ...r,
          buyer_company_name: buyerMap.get(r.buyer_company_id) ?? null,
          linked_offers: offerMap.get(r.id) ?? [],
        }))
      );
      setManagedSuppliers((suppliers as any) ?? []);
      setManagedBuyers((buyers as any) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    all: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    with_responses: rows.filter((r) => r.status === "with_responses").length,
    offer_sent: rows.filter((r) => r.status === "offer_sent").length,
    closed: rows.filter((r) => r.status === "closed").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.product_name?.toLowerCase().includes(q) ||
        (r.buyer_company_name ?? "").toLowerCase().includes(q) ||
        r.destination_country?.toLowerCase().includes(q) ||
        String(r.request_number).includes(q)
      );
    });
  }, [rows, filter, search]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <nav className="text-xs text-gray-500 flex items-center gap-1.5">
        <Link to="/admin/dashboard" className="flex items-center gap-1 hover:text-gray-800">
          <Home className="w-3.5 h-3.5" /> Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-800">Offer Requests</span>
      </nav>

      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="w-7 h-7" style={{ color: WINE }} /> Offer Requests
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Buyer requests across the platform. Create an offer on behalf of a managed supplier to fulfill a request.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          ["All", counts.all, "#374151"],
          ["New", counts.new, "#2563eb"],
          ["With responses", counts.with_responses, "#d97706"],
          ["Offer sent", counts.offer_sent, "#16a34a"],
          ["Closed", counts.closed, "#6b7280"],
        ] as const).map(([l, v, c]) => (
          <Card key={l} className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">{l}</div>
            <div className="text-xl font-bold mt-0.5" style={{ color: c }}>{v}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-1 flex-wrap">
          {(["all", "new", "with_responses", "offer_sent", "closed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md border transition-colors capitalize",
                filter === f ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              style={filter === f ? { backgroundColor: WINE } : {}}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, buyer, country…"
            className="pl-9 h-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No buyer requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Request</th>
                  <th className="text-left px-4 py-3">Buyer</th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Destination</th>
                  <th className="text-right px-4 py-3">Quantity</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Offers</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <div>{formatRequestNumber(r.request_number, r.created_at)}</div>
                      <div className="text-[11px] text-gray-500 font-sans">{fmtDate(r.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">{r.buyer_company_name ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.product_name}</div>
                      {r.category && <div className="text-[11px] text-gray-500">{r.category}</div>}
                    </td>
                    <td className="px-4 py-3">{r.destination_country}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtKg(r.quantity_kg)} kg</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs">
                      {(r.linked_offers?.length ?? 0) === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          {r.linked_offers!.slice(0, 2).map((o) => (
                            <Link
                              key={o.id}
                              to={`/admin/offers/${o.id}`}
                              className="block text-xs hover:underline"
                              style={{ color: WINE }}
                            >
                              M-{String(o.offer_number ?? 0).padStart(6, "0")} · {o.supplier_name ?? "—"}
                            </Link>
                          ))}
                          {(r.linked_offers?.length ?? 0) > 2 && (
                            <span className="text-[11px] text-gray-500">+{(r.linked_offers!.length - 2)} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPickerRequest(r)}
                        style={{
                          padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: WINE, color: "white", border: "none", cursor: "pointer",
                        }}
                      >
                        📝 Create Offer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pickerRequest && (
        <div
          onClick={() => setPickerRequest(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 12, padding: 20, maxWidth: 520, width: "100%",
              maxHeight: "85vh", overflowY: "auto",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create Offer from Request</h3>
            <div style={{ padding: 12, background: "#F9FAFB", borderRadius: 8, margin: "12px 0 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {formatRequestNumber(pickerRequest.request_number, pickerRequest.created_at)}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                {pickerRequest.category ? `${pickerRequest.category} · ` : ""}
                {pickerRequest.product_name} · {fmtKg(pickerRequest.quantity_kg)} kg · to {pickerRequest.destination_country}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                Buyer: {pickerRequest.buyer_company_name ?? "—"}
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#374151", marginBottom: 12, fontWeight: 600 }}>
              Which managed supplier will fulfill this request?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {managedSuppliers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    const reqId = pickerRequest.id;
                    setPickerRequest(null);
                    navigate(`/admin/create-offer?as_company=${s.id}&from_request=${reqId}`);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", border: "1px solid #E5E7EB", borderRadius: 10,
                    background: "white", cursor: "pointer", textAlign: "left",
                  }}
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, background: "#FDF2F8",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                    }}>🏭</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>{s.country ?? "—"}</div>
                  </div>
                </button>
              ))}
              {managedSuppliers.length === 0 && (
                <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: 20 }}>
                  No managed suppliers. Go to Companies → toggle "Managed by Mundus" first.
                </p>
              )}
            </div>
            <div style={{ marginTop: 14, textAlign: "right" }}>
              <button
                onClick={() => setPickerRequest(null)}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB",
                  background: "white", cursor: "pointer", fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}