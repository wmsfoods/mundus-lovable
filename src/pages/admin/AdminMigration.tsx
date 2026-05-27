import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Send, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";

// Isolated auth client so signUp doesn't replace the admin's session.
const SB_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const authIsolated = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

type RowStatus = "ready" | "dup_user" | "dup_company" | "invalid" | "created" | "skipped" | "error";

interface ParsedRow {
  index: number;
  user: string;
  email: string;
  company: string;
  country: string;
  businessType: string;
  profileType: string;
  origStatus: string;
  status: RowStatus;
  note?: string;
  resolvedCompanyId?: string;
  createdUserId?: string;
}

const HEADER_MAP: Record<string, keyof Omit<ParsedRow, "index" | "status" | "note" | "resolvedCompanyId" | "createdUserId">> = {
  user: "user", name: "user", "full name": "user", fullname: "user",
  email: "email", "e-mail": "email", mail: "email",
  company: "company", "company name": "company", organization: "company",
  country: "country",
  "business type": "businessType", business: "businessType", type: "businessType",
  "profile type": "profileType", profile: "profileType",
  status: "origStatus",
};

function normHeader(h: string) { return String(h ?? "").trim().toLowerCase(); }
function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function tempPassword() {
  return crypto.randomUUID().slice(0, 12) + "Aa1!";
}

export default function AdminMigration() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const stats = useMemo(() => {
    const s = { usersCreated: 0, usersSkipped: 0, companiesCreated: 0, companiesLinked: 0, errors: 0 };
    for (const r of rows) {
      if (r.status === "created") s.usersCreated++;
      else if (r.status === "skipped" || r.status === "dup_user") s.usersSkipped++;
      else if (r.status === "error") s.errors++;
    }
    return s;
  }, [rows]);

  const createdUsers = useMemo(() => rows.filter((r) => r.status === "created"), [rows]);

  const onFile = async (file: File) => {
    setFileName(file.name);
    setDone(false);
    setProgress(0);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      const parsed: ParsedRow[] = raw.map((r, i) => {
        const obj: any = { index: i + 1, user: "", email: "", company: "", country: "", businessType: "", profileType: "", origStatus: "" };
        for (const k of Object.keys(r)) {
          const target = HEADER_MAP[normHeader(k)];
          if (target) obj[target] = String(r[k] ?? "").trim();
        }
        let status: RowStatus = "ready";
        let note: string | undefined;
        if (!isEmail(obj.email)) { status = "invalid"; note = "Invalid email"; }
        else if (!obj.user) { status = "invalid"; note = "Missing user name"; }
        else if (!obj.company) { status = "invalid"; note = "Missing company"; }
        return { ...obj, status, note };
      });
      // Pre-check duplicates against DB
      const emails = parsed.filter((r) => r.status === "ready").map((r) => r.email.toLowerCase());
      const companies = Array.from(new Set(parsed.filter((r) => r.status === "ready").map((r) => r.company.toLowerCase())));
      const [{ data: existingUsers }, { data: existingCos }] = await Promise.all([
        emails.length ? supabase.from("users").select("email").in("email", emails) : Promise.resolve({ data: [] as any[] }),
        companies.length ? supabase.from("companies").select("name").in("name", parsed.map((r) => r.company)) : Promise.resolve({ data: [] as any[] }),
      ]);
      const userSet = new Set((existingUsers ?? []).map((u: any) => String(u.email).toLowerCase()));
      const coSet = new Set((existingCos ?? []).map((c: any) => String(c.name).toLowerCase()));
      for (const r of parsed) {
        if (r.status !== "ready") continue;
        if (userSet.has(r.email.toLowerCase())) { r.status = "dup_user"; r.note = "User already exists — will skip"; continue; }
        if (coSet.has(r.company.toLowerCase())) { r.status = "dup_company"; r.note = "Company exists — will link"; }
      }
      setRows(parsed);
      toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
    } catch (e: any) {
      toast.error("Failed to parse file: " + (e?.message ?? "unknown"));
    }
  };

  const runImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setProgress(0);
    setDone(false);
    const updated = [...rows];
    let processed = 0;
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      processed++;
      if (r.status === "invalid") { setProgress(Math.round((processed / updated.length) * 100)); continue; }
      if (r.status === "dup_user") { setProgress(Math.round((processed / updated.length) * 100)); continue; }
      try {
        // Step 1: dedup company (case-insensitive)
        let companyId: string | null = null;
        const { data: existingCo } = await supabase
          .from("companies").select("id").ilike("name", r.company).maybeSingle();
        if (existingCo) {
          companyId = existingCo.id;
        } else {
          const isSupplier = /supplier/i.test(r.businessType);
          const isBuyer = /buyer/i.test(r.businessType);
          const { data: newCo, error: coErr } = await supabase.from("companies").insert({
            name: r.company,
            tax_id: "—",
            country: r.country || "—",
            state: "—",
            address: "—",
            phone: "—",
            is_supplier: isSupplier,
            is_buyer: isBuyer,
            status: "active",
          }).select("id").single();
          if (coErr || !newCo) throw coErr ?? new Error("company_create_failed");
          companyId = newCo.id;
        }
        r.resolvedCompanyId = companyId!;
        // Step 2: dedup user by email (in users)
        const { data: existingUser } = await supabase
          .from("users").select("id").ilike("email", r.email).maybeSingle();
        if (existingUser) { r.status = "skipped"; r.note = "User already exists"; continue; }
        // Step 3: create auth user via isolated client
        const { data: authData, error: authErr } = await authIsolated.auth.signUp({
          email: r.email,
          password: tempPassword(),
          options: { data: { full_name: r.user } },
        });
        if (authErr || !authData?.user) throw authErr ?? new Error("auth_signup_failed");
        const newId = authData.user.id;
        // Step 4: upsert users row
        const { error: upErr } = await supabase.from("users").upsert({
          id: newId,
          email: r.email,
          name: r.user,
          company_id: companyId!,
          active_company_id: companyId!,
          status: "active",
        });
        if (upErr) throw upErr;
        r.status = "created";
        r.createdUserId = newId;
        r.note = "Imported";
        auditLog({
          action: "migration.user_imported",
          category: "system",
          entityType: "company",
          entityId: companyId!,
          entityLabel: `${r.user} (${r.company})`,
          details: { email: r.email, country: r.country, businessType: r.businessType, profileType: r.profileType },
        });
      } catch (e: any) {
        r.status = "error";
        r.note = e?.message ?? "Unknown error";
      }
      setProgress(Math.round((processed / updated.length) * 100));
      setRows([...updated]);
    }
    setImporting(false);
    setDone(true);
    toast.success("Migration complete");
  };

  const sendAllResets = async () => {
    let ok = 0, fail = 0;
    for (const r of createdUsers) {
      const { error } = await supabase.auth.resetPasswordForEmail(r.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) fail++; else { ok++; auditLog({ action: "user.password_reset_sent", category: "user", entityLabel: r.email, severity: "warn" }); }
    }
    toast.success(`Sent ${ok} reset email${ok === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`);
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <RefreshCw size={22} color="#791f1f" />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1c1917", margin: 0 }}>Platform Migration</h1>
      </div>
      <p style={{ color: "#5e5e58", fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Import users and companies from the old Mundus Trade platform. Idempotent — re-runs skip existing emails &amp; companies.
      </p>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: "2px dashed rgba(121,31,31,0.35)", borderRadius: 10, padding: 28,
          textAlign: "center", cursor: "pointer", background: "#fdf6f6", marginBottom: 16,
        }}
      >
        <FileSpreadsheet size={32} color="#791f1f" />
        <div style={{ fontWeight: 600, marginTop: 8 }}>
          {fileName ? fileName : "Drop or click to upload .xlsx / .csv"}
        </div>
        <div style={{ fontSize: 12, color: "#5e5e58", marginTop: 4 }}>
          Expected columns: User, Email, Company, Country, Business Type, Profile Type, Status
        </div>
        <input
          ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>

      {/* Actions bar */}
      {rows.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={runImport} disabled={importing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", background: "#791f1f", color: "white",
              border: 0, borderRadius: 6, fontWeight: 600,
              cursor: importing ? "wait" : "pointer", opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importing ? `Importing… ${progress}%` : `Import ${rows.length} rows`}
          </button>
          {done && createdUsers.length > 0 && (
            <button onClick={sendAllResets}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", color: "#791f1f", border: "1px solid #791f1f", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
              <Send size={14} /> Send reset emails to {createdUsers.length} imported users
            </button>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#5e5e58" }}>{fileName}</span>
        </div>
      )}

      {/* Progress bar */}
      {importing && (
        <div style={{ height: 6, background: "#f5e6e6", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#791f1f", transition: "width .25s" }} />
        </div>
      )}

      {/* Results summary */}
      {done && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10, marginBottom: 16 }}>
          <Stat label="Users created" value={stats.usersCreated} tone="ok" />
          <Stat label="Users skipped" value={stats.usersSkipped} tone="warn" />
          <Stat label="Companies linked" value={rows.filter(r => r.status === "created" || r.status === "skipped").length} tone="info" />
          <Stat label="Errors" value={stats.errors} tone={stats.errors ? "err" : "muted"} />
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden", background: "white" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ background: "#faf3f3", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              <tr>
                {["#", "User", "Email", "Company", "Country", "Business Type", "Profile", "Status", "Note"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#1c1917", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.index} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <td style={{ padding: "8px 10px", color: "#5e5e58" }}>{r.index}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{r.user || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#5e5e58" }}>{r.email || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.company || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#5e5e58" }}>{r.country || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#5e5e58" }}>{r.businessType || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#5e5e58" }}>{r.profileType || "—"}</td>
                  <td style={{ padding: "8px 10px" }}><StatusPill status={r.status} /></td>
                  <td style={{ padding: "8px 10px", color: "#5e5e58", fontSize: 12 }}>{r.note || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "err" | "info" | "muted" }) {
  const color = tone === "ok" ? "#16a34a" : tone === "warn" ? "#b45309" : tone === "err" ? "#b91c1c" : tone === "info" ? "#791f1f" : "#5e5e58";
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "10px 14px", background: "white" }}>
      <div style={{ fontSize: 11, color: "#5e5e58", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; bg: string; color: string; Icon: any }> = {
    ready:        { label: "Ready",          bg: "#ecfdf5", color: "#065f46", Icon: CheckCircle2 },
    dup_user:     { label: "Duplicate user", bg: "#fef3c7", color: "#92400e", Icon: AlertTriangle },
    dup_company:  { label: "Link existing",  bg: "#fef3c7", color: "#92400e", Icon: AlertTriangle },
    invalid:      { label: "Invalid",        bg: "#fee2e2", color: "#991b1b", Icon: XCircle },
    created:      { label: "Created",        bg: "#dcfce7", color: "#166534", Icon: CheckCircle2 },
    skipped:      { label: "Skipped",        bg: "#f5f5f4", color: "#57534e", Icon: AlertTriangle },
    error:        { label: "Error",          bg: "#fee2e2", color: "#991b1b", Icon: XCircle },
  };
  const { label, bg, color, Icon } = map[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
      <Icon size={11} /> {label}
    </span>
  );
}