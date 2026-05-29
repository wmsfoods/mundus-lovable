import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, RotateCw, Mail, Download, Radio } from "lucide-react";

type Row = {
  id: string;
  to_email: string;
  subject: string;
  template_name: string | null;
  template_vars: any;
  status: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  open_count: number | null;
  click_count: number | null;
  bounced_at: string | null;
  bounce_reason: string | null;
};

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function KPICard({ label, value, color, icon }: { label: string; value: number; color?: string; icon: string }) {
  return (
    <div style={{
      padding: 14, background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: color ?? "#0f172a" }}>{value}</span>
    </div>
  );
}

function StatusFlow({ email }: { email: Row }) {
  const isBounced = !!email.bounced_at;
  const isFailed = email.status === "failed";
  const steps = [
    { label: "Queued", done: true },
    { label: "Sent", done: !!email.sent_at },
    { label: isBounced ? "Bounced" : "Delivered", done: !isBounced && !isFailed && email.status === "sent" },
    { label: "Opened", done: !!email.opened_at },
    { label: "Clicked", done: !!email.clicked_at },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {steps.map((s, i) => {
        const failColor = (isFailed || isBounced) && i >= 2;
        const bg = failColor ? "#DC2626" : s.done ? "#059669" : "#E5E7EB";
        const col = s.done || failColor ? "white" : "#9CA3AF";
        return (
          <Fragment key={s.label}>
            {i > 0 && <div style={{ width: 14, height: 1, background: s.done && !failColor ? "#059669" : "#E5E7EB" }} />}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: bg, color: col,
                fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
              }}>
                {failColor ? "✕" : s.done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 9, color: s.done ? "#059669" : "#9CA3AF", marginTop: 2 }}>{s.label}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span style={{ color: "#9CA3AF", fontSize: 12 }}>—</span>;
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 6,
      background: "#EFF6FF", color: "#1E40AF", fontWeight: 600,
    }}>{type}</span>
  );
}

export default function EmailActivity() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [realtimeOn, setRealtimeOn] = useState(true);
  const lastReloadRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("email_queue").select("*")
      .order("created_at", { ascending: false }).limit(2000);
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Realtime: subscribe to email_queue and reload (debounced).
  useEffect(() => {
    if (!realtimeOn) return;
    const channel = (supabase as any)
      .channel("email_queue_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_queue" },
        () => {
          const now = Date.now();
          if (now - lastReloadRef.current < 1500) return;
          lastReloadRef.current = now;
          void load();
        },
      )
      .subscribe();
    return () => {
      try { (supabase as any).removeChannel(channel); } catch { /* noop */ }
    };
  }, [realtimeOn, load]);

  const templates = useMemo(() =>
    Array.from(new Set(rows.map(r => r.template_name).filter(Boolean) as string[])).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "opened" && !r.opened_at) return false;
        else if (statusFilter === "clicked" && !r.clicked_at) return false;
        else if (!["opened", "clicked"].includes(statusFilter) && r.status !== statusFilter) return false;
      }
      if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(r.created_at) > new Date(dateTo + "T23:59:59")) return false;
      if (q && !r.to_email.toLowerCase().includes(q) && !r.subject.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, templateFilter, statusFilter, dateFrom, dateTo]);

  // Reset to first page whenever filters change.
  useEffect(() => { setPage(0); }, [search, templateFilter, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize],
  );

  const stats = useMemo(() => ({
    total: filtered.length,
    sent: filtered.filter(e => e.status === "sent").length,
    opened: filtered.filter(e => e.opened_at).length,
    clicked: filtered.filter(e => e.clicked_at).length,
    bounced: filtered.filter(e => e.bounced_at).length,
    failed: filtered.filter(e => e.status === "failed").length,
  }), [filtered]);

  const retryEmail = async (id: string) => {
    await (supabase as any).from("email_queue")
      .update({ status: "queued", error_message: null }).eq("id", id);
    await supabase.functions.invoke("send-email", { body: { email_id: id } });
    toast.success("Email re-queued for sending");
    void load();
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info("No rows to export with the current filters.");
      return;
    }
    const header = [
      "Date", "Template", "Recipient", "Subject", "Status",
      "Sent at", "Opened at", "Clicked at", "Opens", "Clicks",
      "Bounced at", "Bounce reason", "Error",
    ];
    const esc = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        r.created_at, r.template_name ?? "", r.to_email, r.subject, r.status,
        r.sent_at ?? "", r.opened_at ?? "", r.clicked_at ?? "",
        r.open_count ?? 0, r.click_count ?? 0,
        r.bounced_at ?? "", r.bounce_reason ?? "", r.error_message ?? "",
      ].map(esc).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  };

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Mail size={20} /> Email Activity
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
            Deliveries, opens, clicks and bounces across the platform.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Button
            variant={realtimeOn ? "default" : "outline"}
            size="sm"
            onClick={() => setRealtimeOn(v => !v)}
            title="Toggle live updates"
          >
            <Radio className={`h-4 w-4 mr-1.5 ${realtimeOn ? "animate-pulse" : ""}`} />
            {realtimeOn ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <KPICard icon="✉️" label="Total" value={stats.total} />
        <KPICard icon="✅" label="Delivered" value={stats.sent} color="#059669" />
        <KPICard icon="👁" label="Opened" value={stats.opened} color="#2563EB" />
        <KPICard icon="🖱" label="Clicked" value={stats.clicked} color="#7C3AED" />
        <KPICard icon="⚠️" label="Bounced" value={stats.bounced} color="#D97706" />
        <KPICard icon="❌" label="Failed" value={stats.failed} color="#DC2626" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input placeholder="Search recipient or subject..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }} />
        <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="all">All types</option>
          {templates.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
          <option value="all">All statuses</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="failed">Failed</option>
        </select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 160 }} />
      </div>

      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", fontSize: 11, textTransform: "uppercase", color: "#6b7280" }}>
            <tr>
              <th style={{ textAlign: "left", padding: 10 }}>Date</th>
              <th style={{ textAlign: "left", padding: 10 }}>Type</th>
              <th style={{ textAlign: "left", padding: 10 }}>Recipient</th>
              <th style={{ textAlign: "left", padding: 10 }}>Subject</th>
              <th style={{ textAlign: "left", padding: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: "center", color: "#9CA3AF" }}>
                No emails match the current filters.
              </td></tr>
            )}
            {pageRows.map(e => (
              <Fragment key={e.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                >
                  <td style={{ padding: 10, color: "#6b7280", whiteSpace: "nowrap" }}>{fmt(e.created_at)}</td>
                  <td style={{ padding: 10 }}><TypeBadge type={e.template_name} /></td>
                  <td style={{ padding: 10 }}>{e.to_email}</td>
                  <td style={{ padding: 10, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.subject}>{e.subject}</td>
                  <td style={{ padding: 10 }}><StatusFlow email={e} /></td>
                </tr>
                {expandedId === e.id && (
                  <tr style={{ background: "#F9FAFB" }}>
                    <td colSpan={5} style={{ padding: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                        <div>
                          <div><strong>Template:</strong> {e.template_name ?? "—"}</div>
                          <div><strong>Recipient:</strong> {e.to_email}</div>
                          <div><strong>Queued:</strong> {fmt(e.created_at)}</div>
                          <div><strong>Sent:</strong> {fmt(e.sent_at)}</div>
                          <div><strong>Opened:</strong> {fmt(e.opened_at)} ({e.open_count ?? 0}×)</div>
                          <div><strong>Clicked:</strong> {fmt(e.clicked_at)} ({e.click_count ?? 0}×)</div>
                          {e.bounced_at && <div style={{ color: "#D97706" }}><strong>Bounced:</strong> {fmt(e.bounced_at)} — {e.bounce_reason}</div>}
                        </div>
                        <div>
                          <strong>Template vars:</strong>
                          <pre style={{ fontSize: 11, background: "#F3F4F6", padding: 8, borderRadius: 6, maxHeight: 200, overflow: "auto", marginTop: 4 }}>
                            {JSON.stringify(e.template_vars, null, 2)}
                          </pre>
                        </div>
                      </div>
                      {e.status === "failed" && (
                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ color: "#DC2626", fontSize: 13 }}>
                            <strong>Error:</strong> {e.error_message}
                          </span>
                          <button onClick={(ev) => { ev.stopPropagation(); void retryEmail(e.id); }} style={{
                            padding: "4px 12px", borderRadius: 6,
                            background: "#FEE2E2", color: "#DC2626", border: "none",
                            fontSize: 12, cursor: "pointer", fontWeight: 600,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                            <RotateCw size={12} /> Retry
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length > pageSize && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: "#fafafa",
            fontSize: 12, color: "#6b7280",
          }}>
            <span>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                ← Prev
              </Button>
              <span style={{ padding: "6px 8px" }}>Page {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}