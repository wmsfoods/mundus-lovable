import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, RotateCw, Mail, Download, Radio } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";

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

function offerNoOf(r: Row): string | null {
  const v = r.template_vars;
  const n = v?.offerNumber ?? v?.offer_number ?? v?.offerNo;
  return n ? `M-${String(n).replace(/^M-/, "")}` : null;
}

function MetricCard({
  title, value, data, color, riskAt, legend,
}: {
  title: string; value: string;
  data: { day: string; value: number }[];
  color: string; riskAt?: number;
  legend?: { label: string; count: number; pct: string; color: string }[];
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 280,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#6b7280" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "#0f172a", lineHeight: 1 }}>{value}</div>
      <div style={{ flex: 1, minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={36} />
            <RTooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            {riskAt !== undefined && (
              <ReferenceLine y={riskAt} stroke="#F97316" strokeDasharray="4 4" label={{ value: "RISK", fill: "#F97316", fontSize: 10, position: "insideTopLeft" }} />
            )}
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {legend && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          {legend.map(l => (
            <div key={l.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#374151" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                {l.label}
              </span>
              <span style={{ color: "#6b7280" }}>{l.count} <strong style={{ color: "#0f172a" }}>{l.pct}</strong></span>
            </div>
          ))}
        </div>
      )}
    </div>
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

  // ---- Resend-style metrics (per-day buckets, last N days from filter) ----
  const metrics = useMemo(() => {
    const days: { key: string; day: string }[] = [];
    const span = 15;
    const today = new Date();
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    const buckets = days.map(d => ({
      day: d.day, sent: 0, opened: 0, clicked: 0, bounced: 0,
    }));
    for (const r of filtered) {
      const k = (r.created_at ?? "").slice(0, 10);
      const i = idx.get(k);
      if (i === undefined) continue;
      buckets[i].sent += 1;
      if (r.opened_at) buckets[i].opened += 1;
      if (r.clicked_at) buckets[i].clicked += 1;
      if (r.bounced_at) buckets[i].bounced += 1;
    }
    const total = filtered.length || 1;
    const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`;
    const ratePer = (key: "opened" | "clicked" | "bounced") =>
      buckets.map(b => ({ day: b.day, value: b.sent > 0 ? Math.round((b[key] / b.sent) * 100) : 0 }));
    const countPer = (key: "sent" | "bounced") =>
      buckets.map(b => ({ day: b.day, value: b[key] }));
    return {
      totalEmails: filtered.length,
      deliverability: filtered.length
        ? `${(((filtered.length - stats.bounced - stats.failed) / filtered.length) * 100).toFixed(2)}%`
        : "—",
      bounceRate: pct(stats.bounced),
      complainRate: "0%",
      openRate: pct(stats.opened),
      clickRate: pct(stats.clicked),
      bounceData: countPer("bounced"),
      complainData: buckets.map(b => ({ day: b.day, value: 0 })),
      openData: ratePer("opened"),
      clickData: ratePer("clicked"),
      deliveryData: buckets.map(b => ({ day: b.day, value: b.sent })),
    };
  }, [filtered, stats]);

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
      "Date", "Template", "Recipient", "Offer #", "Subject", "Status",
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
        r.created_at, r.template_name ?? "", r.to_email, offerNoOf(r) ?? "", r.subject, r.status,
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

      {/* Resend-style metrics dashboard */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#6b7280" }}>Emails</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: "#0f172a" }}>{metrics.totalEmails}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#6b7280" }}>Deliverability rate</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: "#0f172a" }}>{metrics.deliverability}</div>
          </div>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.deliveryData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={36} />
              <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#emailGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        <MetricCard
          title="Bounce rate" value={metrics.bounceRate} data={metrics.bounceData}
          color="#fb7185" riskAt={4}
          legend={[{ label: "Bounced", count: stats.bounced, pct: metrics.bounceRate, color: "#fb7185" }]}
        />
        <MetricCard
          title="Complain rate" value={metrics.complainRate} data={metrics.complainData}
          color="#f59e0b" riskAt={0.08}
          legend={[{ label: "Complained", count: 0, pct: "0%", color: "#f59e0b" }]}
        />
        <MetricCard
          title="Open rate" value={metrics.openRate} data={metrics.openData}
          color="#3b82f6"
          legend={[{ label: "Opened", count: stats.opened, pct: metrics.openRate, color: "#3b82f6" }]}
        />
        <MetricCard
          title="Click rate" value={metrics.clickRate} data={metrics.clickData}
          color="#a78bfa"
          legend={[{ label: "Clicked", count: stats.clicked, pct: metrics.clickRate, color: "#a78bfa" }]}
        />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input placeholder="Search recipient, subject or offer #..." value={search} onChange={(e) => setSearch(e.target.value)}
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
              <th style={{ textAlign: "left", padding: 10 }}>Template</th>
              <th style={{ textAlign: "left", padding: 10 }}>Recipient</th>
              <th style={{ textAlign: "left", padding: 10 }}>Offer #</th>
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
                  <td style={{ padding: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#0f172a" }}>
                    {offerNoOf(e) ?? <span style={{ color: "#9CA3AF" }}>—</span>}
                  </td>
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