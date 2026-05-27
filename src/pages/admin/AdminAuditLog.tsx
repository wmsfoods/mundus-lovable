import { useEffect, useMemo, useState } from "react";
import { History, Search, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  created_at: string;
  user_email: string | null;
  company_name: string | null;
  actor_role: string | null;
  action: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  details: any;
  severity: string;
};

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  offer:       { bg: "#FFE4EC", fg: "#9B2251" },
  request:     { bg: "#DBEAFE", fg: "#1E40AF" },
  negotiation: { bg: "#FED7AA", fg: "#9A3412" },
  order:       { bg: "#D1FAE5", fg: "#065F46" },
  company:     { bg: "#EDE9FE", fg: "#5B21B6" },
  user:        { bg: "#FCE7F3", fg: "#9D174D" },
  catalog:     { bg: "#E5E7EB", fg: "#374151" },
  system:      { bg: "#E2E8F0", fg: "#1E293B" },
  auth:        { bg: "#E0E7FF", fg: "#3730A3" },
};

const SEVERITY_BORDER: Record<string, string> = {
  info: "transparent",
  warn: "#F59E0B",
  critical: "#DC2626",
};

const PAGE = 50;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function summarizeDetails(d: any): string {
  if (!d || typeof d !== "object") return "—";
  const parts: string[] = [];
  if (d.round != null) parts.push(`Round ${d.round}`);
  if (d.itemCount != null) parts.push(`${d.itemCount} items`);
  if (d.cutsCount != null) parts.push(`${d.cutsCount} cuts`);
  if (d.totalKg != null) parts.push(`${Number(d.totalKg).toLocaleString()} kg`);
  if (d.totalValue != null) parts.push(`$${Number(d.totalValue).toLocaleString()}`);
  if (d.totalBidValue != null) parts.push(`$${Number(d.totalBidValue).toLocaleString()}`);
  if (d.destination) parts.push(`→ ${d.destination}`);
  if (d.category) parts.push(String(d.category));
  return parts.length ? parts.join(" · ") : "—";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="adm-panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#8B2252" }}>{value}</span>
    </div>
  );
}

export default function AdminAuditLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [actorRole, setActorRole] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = (supabase.from("audit_log" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (range !== "all") {
        const since = new Date();
        if (range === "today") since.setHours(0, 0, 0, 0);
        else if (range === "7d") since.setDate(since.getDate() - 7);
        else if (range === "30d") since.setDate(since.getDate() - 30);
        q = q.gte("created_at", since.toISOString());
      }
      if (category !== "all") q = q.eq("category", category);
      if (actorRole !== "all") q = q.eq("actor_role", actorRole);
      if (severity !== "all") q = q.eq("severity", severity);

      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("[audit] load error", error);
        setRows([]);
      } else {
        setRows((data || []) as Row[]);
      }
      setPage(0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [category, actorRole, severity, range]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.user_email || "").toLowerCase().includes(s) ||
      (r.company_name || "").toLowerCase().includes(s) ||
      (r.entity_label || "").toLowerCase().includes(s) ||
      r.action.toLowerCase().includes(s)
    );
  }, [rows, search]);

  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const stats = useMemo(() => {
    const total = rows.length;
    const warn = rows.filter(r => r.severity === "warn").length;
    const crit = rows.filter(r => r.severity === "critical").length;
    const actors = new Set(rows.map(r => r.user_email).filter(Boolean)).size;
    return { total, warn, crit, actors };
  }, [rows]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "linear-gradient(135deg, #9B2251, #6C0B28)",
          display: "grid", placeItems: "center", color: "white",
        }}>
          <History size={20} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1f2937" }}>Audit Log</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            Complete activity trail across the platform
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="Events" value={stats.total.toLocaleString()} />
        <StatCard label="Active actors" value={stats.actors} />
        <StatCard label="Warnings" value={stats.warn} />
        <StatCard label="Critical" value={stats.crit} />
      </div>

      {/* Filters */}
      <div className="adm-panel" style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, company, entity, action…"
            style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={selStyle}>
          <option value="all">All categories</option>
          {["offer","request","negotiation","order","company","user","catalog","system","auth"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={actorRole} onChange={(e) => setActorRole(e.target.value)} style={selStyle}>
          <option value="all">All actors</option>
          <option value="supplier">Supplier</option>
          <option value="buyer">Buyer</option>
          <option value="admin">Admin</option>
          <option value="system">System</option>
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={selStyle}>
          <option value="all">All severity</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value as any)} style={selStyle}>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Table */}
      <div className="adm-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={thStyle}>Timestamp</th>
                <th style={thStyle}>Actor</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Entity</th>
                <th style={thStyle}>Details</th>
                <th style={thStyle}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>Loading…</td></tr>
              )}
              {!loading && paged.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No events match these filters.</td></tr>
              )}
              {!loading && paged.map(r => {
                const colors = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.system;
                const isExp = expanded.has(r.id);
                const isCrit = r.severity === "critical";
                return (
                  <>
                    <tr key={r.id}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          borderLeft: `3px solid ${SEVERITY_BORDER[r.severity] || "transparent"}`,
                          fontWeight: isCrit ? 600 : 400,
                          cursor: "pointer",
                        }}
                        onClick={() => toggleExpand(r.id)}>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}>{fmtDate(r.created_at)}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 500 }}>{r.user_email || "—"}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>
                            {r.company_name || "—"} · <span style={{ textTransform: "capitalize" }}>{r.actor_role || "system"}</span>
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: colors.bg,
                          color: colors.fg,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        }}>{r.action}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 500 }}>{r.entity_label || "—"}</span>
                          {r.entity_type && (
                            <span style={{ fontSize: 11, color: "#6b7280" }}>{r.entity_type}</span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>{summarizeDetails(r.details)}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                          color: r.severity === "critical" ? "#DC2626" : r.severity === "warn" ? "#B45309" : "#6b7280",
                        }}>{r.severity}</span>
                      </td>
                    </tr>
                    {isExp && (
                      <tr key={r.id + "-exp"} style={{ background: "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                        <td colSpan={6} style={{ padding: "8px 16px 14px" }}>
                          <pre style={{
                            margin: 0, padding: 10, background: "#1f2937", color: "#e5e7eb",
                            borderRadius: 6, fontSize: 11, overflow: "auto",
                            fontFamily: "ui-monospace, SFMono-Regular, monospace",
                          }}>{JSON.stringify(r.details, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>
            <span>
              Showing {page * PAGE + 1}–{Math.min((page + 1) * PAGE, filtered.length)} of {filtered.length.toLocaleString()}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={pgBtn(page === 0)}>← Prev</button>
              <span style={{ alignSelf: "center" }}>Page {page + 1} / {totalPages}</span>
              <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} style={pgBtn(page + 1 >= totalPages)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600,
  color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 12px", verticalAlign: "top", color: "#1f2937",
};
const selStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, background: "white",
};
const pgBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb",
  background: disabled ? "#f9fafb" : "white", color: disabled ? "#9ca3af" : "#1f2937",
  cursor: disabled ? "not-allowed" : "pointer", fontSize: 12,
});