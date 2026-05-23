import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  UserCheck, Search, ChevronDown, ChevronRight, Check, X, Loader2, Inbox, Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const WINE = "#B64769";

type RequestRow = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  reviewed_at: string | null;
  reject_reason: string | null;
  company_name: string | null;
  role: string | null;
  registration_country: string | null;
  tax_id: string | null;
  proteins: string[] | null;
  countries_of_operation: string[] | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  website: string | null;
  certificate_url: string | null;
  scan_result: any;
};

type Filter = "all" | "pending" | "approved" | "rejected";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    approved: { label: "Approved", cls: "bg-green-100 text-green-800 border-green-200" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", s.cls)}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>{value}</div>
    </Card>
  );
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
}

export default function AdminUserRequests() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<RequestRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data || []) as RequestRow[]);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    total: rows.length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        (r.company_name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActing(true);
    const { error } = await supabase
      .from("user_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", approveTarget.id);
    if (error) { setActing(false); toast.error(error.message); return; }
    // TODO: Auto-assign approved user to their company HQ in `user_offices`.
    // When the real auth flow is wired (creating an auth.users row + a row in
    // public.users / public.companies on approval), insert here:
    //   await supabase.from("user_offices").insert({
    //     user_id: <newUserId>,
    //     company_id: <hqCompanyId>,
    //     role: "member",
    //     is_primary: true,
    //   });
    // Today, user_requests only flips status — no user/company exists yet.
    await supabase.functions.invoke("signup-notifications", {
      body: {
        action: "approval",
        userEmail: approveTarget.email,
        userName: approveTarget.name,
        companyName: approveTarget.company_name || "",
      },
    });
    toast.success("User approved. Notification email sent.");
    setApproveTarget(null);
    setActing(false);
    load();
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActing(true);
    const { error } = await supabase
      .from("user_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reject_reason: rejectReason || null,
      })
      .eq("id", rejectTarget.id);
    if (error) { setActing(false); toast.error(error.message); return; }
    await supabase.functions.invoke("signup-notifications", {
      body: {
        action: "rejection",
        userEmail: rejectTarget.email,
        userName: rejectTarget.name,
      },
    });
    toast.success("User rejected. Notification email sent.");
    setRejectTarget(null);
    setRejectReason("");
    setActing(false);
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-1.5">
        <Link to="/admin/dashboard" className="flex items-center gap-1 hover:text-gray-800">
          <Home className="w-3.5 h-3.5" /> Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-800">User Requests</span>
      </nav>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span>👥</span> User Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve new user registrations
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={counts.pending} color="#d97706" />
        <StatCard label="Approved" value={counts.approved} color="#16a34a" />
        <StatCard label="Rejected" value={counts.rejected} color="#dc2626" />
        <StatCard label="Total" value={counts.total} color="#374151" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-1 flex-wrap">
          {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md border transition-colors capitalize",
                filter === f
                  ? "border-transparent text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
              style={filter === f ? { backgroundColor: WINE } : {}}
            >
              {f}
              {f === "pending" && counts.pending > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                  filter === f ? "bg-white/25" : "bg-amber-100 text-amber-800",
                )}>
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, company…"
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No user requests found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="w-8"></th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Company</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Country</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Requested</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <RowDesktop
                      key={r.id}
                      r={r}
                      expanded={expanded === r.id}
                      onToggle={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                      onApprove={() => setApproveTarget(r)}
                      onReject={() => { setRejectTarget(r); setRejectReason(""); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {filtered.map((r) => (
                <CardMobile
                  key={r.id}
                  r={r}
                  expanded={expanded === r.id}
                  onToggle={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                  onApprove={() => setApproveTarget(r)}
                  onReject={() => { setRejectTarget(r); setRejectReason(""); }}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve registration?</DialogTitle>
            <DialogDescription>
              Approve <strong>{approveTarget?.name}</strong>'s registration for{" "}
              <strong>{approveTarget?.company_name || approveTarget?.email}</strong>?
              They will receive a confirmation email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={acting}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={acting}
              style={{ backgroundColor: WINE }}
              className="text-white hover:opacity-90"
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Approve</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject registration?</DialogTitle>
            <DialogDescription>
              Reject <strong>{rejectTarget?.name}</strong>'s registration. They will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional, internal only)</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why is this request being rejected?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={acting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={acting}
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" /> Reject</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionButtons({
  r, onApprove, onReject,
}: { r: RequestRow; onApprove: () => void; onReject: () => void }) {
  if (r.status !== "pending") {
    return <span className="text-xs text-gray-400">{r.reviewed_at ? `Reviewed ${fmtDate(r.reviewed_at)}` : "—"}</span>;
  }
  return (
    <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        onClick={onApprove}
        className="h-8 text-white hover:opacity-90"
        style={{ backgroundColor: "#16a34a" }}
      >
        <Check className="w-3.5 h-3.5 mr-1" /> Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onReject}
        className="h-8 border-red-200 text-red-600 hover:bg-red-50"
      >
        <X className="w-3.5 h-3.5 mr-1" /> Reject
      </Button>
    </div>
  );
}

function RowDesktop({
  r, expanded, onToggle, onApprove, onReject,
}: {
  r: RequestRow; expanded: boolean; onToggle: () => void;
  onApprove: () => void; onReject: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "border-t cursor-pointer hover:bg-gray-50/70",
          r.status === "pending" && "bg-amber-50/30",
        )}
      >
        <td className="pl-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </td>
        <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
        <td className="px-4 py-3 text-gray-600">{r.email}</td>
        <td className="px-4 py-3 text-gray-600">{r.company_name || "—"}</td>
        <td className="px-4 py-3 text-gray-600 capitalize">{r.role || "—"}</td>
        <td className="px-4 py-3 text-gray-600">{r.registration_country || "—"}</td>
        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.created_at)}</td>
        <td className="px-4 py-3"><ActionButtons r={r} onApprove={onApprove} onReject={onReject} /></td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/50 border-t">
          <td></td>
          <td colSpan={8} className="px-4 py-4">
            <Details r={r} />
          </td>
        </tr>
      )}
    </>
  );
}

function CardMobile({
  r, expanded, onToggle, onApprove, onReject,
}: {
  r: RequestRow; expanded: boolean; onToggle: () => void;
  onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className={cn("p-4", r.status === "pending" && "bg-amber-50/30")}>
      <div className="flex items-start justify-between gap-2" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{r.name}</div>
          <div className="text-xs text-gray-500 truncate">{r.email}</div>
          {r.company_name && <div className="text-xs text-gray-500 truncate">{r.company_name}</div>}
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={r.status} />
            <span className="text-[11px] text-gray-400">{fmtDate(r.created_at)}</span>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </div>
      {expanded && <div className="mt-3"><Details r={r} /></div>}
      {r.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove} className="flex-1 text-white" style={{ backgroundColor: "#16a34a" }}>
            <Check className="w-3.5 h-3.5 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} className="flex-1 border-red-200 text-red-600">
            <X className="w-3.5 h-3.5 mr-1" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-sm text-gray-800 mt-0.5 break-words">{value || "—"}</div>
    </div>
  );
}

function Details({ r }: { r: RequestRow }) {
  const fullAddress = [r.address, r.city, r.state, r.zip, r.country].filter(Boolean).join(", ");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Field label="Full Name" value={r.name} />
      <Field label="Email" value={r.email} />
      <Field label="Company Name" value={r.company_name} />
      <Field label="Tax ID" value={r.tax_id} />
      <Field label="Role" value={r.role && <span className="capitalize">{r.role}</span>} />
      <Field label="Country of Registration" value={r.registration_country} />
      <Field
        label="Countries of Operation"
        value={r.countries_of_operation?.length ? r.countries_of_operation.join(", ") : null}
      />
      <Field
        label="Proteins"
        value={
          r.proteins?.length ? (
            <div className="flex flex-wrap gap-1">
              {r.proteins.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
              ))}
            </div>
          ) : null
        }
      />
      <Field label="Phone" value={r.phone} />
      <Field label="Address" value={fullAddress || null} />
      <Field
        label="Website"
        value={r.website ? (
          <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-[#B64769] hover:underline">
            {r.website}
          </a>
        ) : null}
      />
      <Field label="Registered At" value={fmtDate(r.created_at)} />
      {r.certificate_url && (
        <div className="sm:col-span-2 lg:col-span-3 mt-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Uploaded Certificate / License</div>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(r.certificate_url) ? (
              <div className="p-4">
                <img
                  src={r.certificate_url}
                  alt="Certificate"
                  className="max-h-[400px] w-auto rounded border border-gray-100 shadow-sm"
                />
              </div>
            ) : (
              <div className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Certificate Document (PDF)</p>
                  <p className="text-xs text-gray-500">Click to view or download</p>
                </div>
              </div>
            )}
            <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50 flex gap-3">
              <a
                href={r.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline flex items-center gap-1"
                style={{ color: "#B64769" }}
              >
                🔗 Open in new tab
              </a>
              <a
                href={r.certificate_url}
                download
                className="text-sm text-gray-600 hover:underline flex items-center gap-1"
              >
                ⬇️ Download
              </a>
            </div>
          </div>
        </div>
      )}
      {r.scan_result && (
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">AI Document Verification</div>
          <div className={cn(
            "rounded-lg border p-4",
            r.scan_result.overallVerification === "verified" ? "border-green-200 bg-green-50" :
            r.scan_result.overallVerification === "partial" ? "border-amber-200 bg-amber-50" :
            "border-gray-200 bg-gray-50"
          )}>
            <div className="flex items-start gap-3">
              <span className="text-lg">
                {r.scan_result.overallVerification === "verified" ? "✅" :
                 r.scan_result.overallVerification === "partial" ? "⚠️" : "❓"}
              </span>
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-800">
                  {r.scan_result.overallVerification === "verified" ? "Document Verified" :
                   r.scan_result.overallVerification === "partial" ? "Partial Match" :
                   "Needs Manual Review"}
                </p>
                {r.scan_result.documentType && (
                  <p className="text-gray-600 mt-1">Type: {r.scan_result.documentType}</p>
                )}
                {r.scan_result.extractedCompanyName && (
                  <p className="text-gray-600">
                    Company: {r.scan_result.extractedCompanyName}
                    {r.scan_result.companyNameMatch === "match" ? " ✓" : r.scan_result.companyNameMatch === "mismatch" ? " ✗" : ""}
                  </p>
                )}
                {r.scan_result.extractedTaxId && (
                  <p className="text-gray-600">
                    Tax ID: {r.scan_result.extractedTaxId}
                    {r.scan_result.taxIdMatch === "match" ? " ✓" : r.scan_result.taxIdMatch === "mismatch" ? " ✗" : ""}
                  </p>
                )}
                {r.scan_result.extractedCountry && (
                  <p className="text-gray-600">
                    Country: {r.scan_result.extractedCountry}
                    {r.scan_result.countryMatch === "match" ? " ✓" : ""}
                  </p>
                )}
                {r.scan_result.notes && (
                  <p className="text-gray-500 mt-1 italic text-xs">{r.scan_result.notes}</p>
                )}
                {r.scan_result.confidence && (
                  <p className="text-gray-400 text-xs mt-1">Confidence: {(r.scan_result.confidence * 100).toFixed(0)}%</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {r.reject_reason && (
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Rejection Reason (internal)" value={r.reject_reason} />
        </div>
      )}
    </div>
  );
}