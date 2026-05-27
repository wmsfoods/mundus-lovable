import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";

type Destination = "companies" | "prospects";
type RowStatus = "ready" | "warn" | "invalid" | "created" | "linked" | "skipped" | "error";

// ---- Field schemas ----------------------------------------------------------

type FieldKey =
  // shared
  | "company" | "country" | "email" | "fullName" | "phone" | "mobile"
  | "city" | "state" | "address" | "postalCode" | "website" | "linkedin"
  // company-only
  | "businessType" | "profileType"
  // prospect-only
  | "jobTitle" | "personalLinkedin" | "companyLinkedin" | "industry"
  | "additionalEmail" | "decisionLevel" | "leadType";

const COMPANY_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "fullName",    label: "Full Name",     required: true },
  { key: "email",       label: "Email",         required: true },
  { key: "company",     label: "Company Name",  required: true },
  { key: "country",     label: "Country" },
  { key: "businessType",label: "Business Type (buyer/supplier)" },
  { key: "profileType", label: "Profile Type (master/member)" },
];

const PROSPECT_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "company",         label: "Company Name",      required: true },
  { key: "email",           label: "Email",             required: true },
  { key: "fullName",        label: "Full Name" },
  { key: "jobTitle",        label: "Job Title" },
  { key: "phone",           label: "Phone" },
  { key: "mobile",          label: "Mobile" },
  { key: "personalLinkedin",label: "Personal LinkedIn" },
  { key: "companyLinkedin", label: "Company LinkedIn" },
  { key: "website",         label: "Website" },
  { key: "industry",        label: "Industry" },
  { key: "country",         label: "Country" },
  { key: "city",            label: "City" },
  { key: "state",           label: "State/Region" },
  { key: "address",         label: "Street" },
  { key: "postalCode",      label: "ZIP / Postal Code" },
  { key: "additionalEmail", label: "Additional Email" },
  { key: "decisionLevel",   label: "Decision Level" },
  { key: "leadType",        label: "Lead Type (buyer/supplier)" },
];

const AUTO_MAP: Record<string, FieldKey> = {
  "user": "fullName", "name": "fullName", "full name": "fullName", "fullname": "fullName",
  "contact name": "fullName", "contact": "fullName",
  "email": "email", "e-mail": "email", "mail": "email", "primary email": "email",
  "additional email": "additionalEmail", "secondary email": "additionalEmail",
  "company": "company", "company name": "company", "organization": "company", "organisation": "company",
  "country": "country",
  "city": "city",
  "state": "state", "region": "state", "province": "state",
  "street": "address", "address": "address", "address line": "address",
  "zip": "postalCode", "zip code": "postalCode", "postal code": "postalCode", "postcode": "postalCode",
  "phone": "phone", "telephone": "phone", "work phone": "phone",
  "mobile": "mobile", "cell": "mobile", "cellphone": "mobile",
  "website": "website", "url": "website", "site": "website",
  "linkedin": "personalLinkedin", "personal linkedin": "personalLinkedin",
  "company linkedin": "companyLinkedin", "linkedin company": "companyLinkedin",
  "industry": "industry",
  "job title": "jobTitle", "title": "jobTitle", "role/job title": "jobTitle", "role": "jobTitle",
  "decision level": "decisionLevel", "seniority": "decisionLevel",
  "lead type": "leadType",
  "business type": "businessType", "business": "businessType", "type": "businessType",
  "profile type": "profileType", "profile": "profileType",
};

function normHeader(h: string) { return String(h ?? "").trim().toLowerCase(); }
function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function extractNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .split(/[._-]/).filter((p) => p.length > 1)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

interface RawRow { __raw: Record<string, string> }

interface ParsedRow extends RawRow {
  index: number;
  status: RowStatus;
  note?: string;
  mapped: Partial<Record<FieldKey, string>>;
}

// ---- Component --------------------------------------------------------------

export default function AdminImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "ignore">>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<Record<string, number>>({});

  const fields = destination === "prospects" ? PROSPECT_FIELDS : COMPANY_FIELDS;
  const requiredKeys = fields.filter((f) => f.required).map((f) => f.key);

  const reset = () => {
    setFileName(""); setHeaders([]); setMapping({}); setRows([]);
    setProgress(0); setDone(false); setResults({});
  };

  const onFile = async (file: File) => {
    if (!destination) { toast.error("Choose a destination first"); return; }
    setFileName(file.name);
    setDone(false); setProgress(0); setResults({});
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      if (!raw.length) { toast.error("File appears to be empty"); return; }
      const hdrs = Object.keys(raw[0]);
      const map: Record<string, FieldKey | "ignore"> = {};
      for (const h of hdrs) {
        const auto = AUTO_MAP[normHeader(h)];
        map[h] = auto ?? "ignore";
      }
      setHeaders(hdrs);
      setMapping(map);
      const parsed: ParsedRow[] = raw.map((r, i) => buildRow(i + 1, r, map, requiredKeys));
      setRows(parsed);
      toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
    } catch (e: any) {
      toast.error("Failed to parse file: " + (e?.message ?? "unknown"));
    }
  };

  const onMappingChange = (header: string, value: FieldKey | "ignore") => {
    const next = { ...mapping, [header]: value };
    setMapping(next);
    setRows((prev) => prev.map((r) => buildRow(r.index, r.__raw, next, requiredKeys)));
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const ready = rows.filter((r) => r.status === "ready" || r.status === "warn").length;
    const invalid = rows.filter((r) => r.status === "invalid").length;
    const uniqueCompanies = new Set(rows.filter((r) => r.mapped.company).map((r) => r.mapped.company!.trim().toLowerCase())).size;
    const emails = rows.map((r) => r.mapped.email?.toLowerCase()).filter(Boolean) as string[];
    const dupEmails = emails.length - new Set(emails).size;
    return { total, ready, invalid, uniqueCompanies, dupEmails };
  }, [rows]);

  // ---- Import runners -----------------------------------------------------

  const runImport = async () => {
    if (!rows.length || !destination) return;
    setImporting(true); setProgress(0); setDone(false);
    if (destination === "companies") await importCompanies();
    else await importProspects();
    setImporting(false); setDone(true);
  };

  const importCompanies = async () => {
    const updated = [...rows];
    const companyCache = new Map<string, string>();
    let created = 0, linked = 0, skipped = 0, errors = 0;
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      if (r.status === "invalid") { skipped++; bump(i, updated); continue; }
      try {
        const m = r.mapped;
        let companyId: string | null = null;
        const cacheKey = m.company!.trim().toLowerCase();
        if (companyCache.has(cacheKey)) {
          companyId = companyCache.get(cacheKey)!;
          linked++;
        } else {
          const { data: existingCo } = await supabase
            .from("companies").select("id").ilike("name", m.company!.trim()).maybeSingle();
          if (existingCo) {
            companyId = existingCo.id;
            linked++;
          } else {
            const isSupplier = /supplier/i.test(m.businessType ?? "");
            const isBuyer = /buyer/i.test(m.businessType ?? "");
            const { data: newCo, error: coErr } = await supabase.from("companies").insert({
              name: m.company!.trim(),
              country: m.country || "—",
              state: "—", address: "—", phone: "—",
              is_supplier: isSupplier, is_buyer: isBuyer,
              status: "active",
            } as any).select("id").single();
            if (coErr || !newCo) throw coErr ?? new Error("company_create_failed");
            companyId = newCo.id;
            created++;
          }
          companyCache.set(cacheKey, companyId!);
        }
        const role = /master/i.test(m.profileType ?? "") ? "master" : "member";
        const { error: upErr } = await supabase
          .from("team_invitations")
          .upsert({
            company_id: companyId!,
            email: m.email!.trim().toLowerCase(),
            full_name: (m.fullName ?? "").trim() || extractNameFromEmail(m.email!),
            profile_type: m.profileType || null,
            role,
            account_status: "pending",
          } as any, { onConflict: "company_id,email" });
        if (upErr) throw upErr;
        r.status = "created"; r.note = "Imported";
        auditLog({
          action: "import.team_member_imported", category: "system",
          entityType: "company", entityId: companyId!,
          entityLabel: `${m.fullName} (${m.company})`,
          details: { email: m.email, country: m.country, businessType: m.businessType },
        });
      } catch (e: any) {
        r.status = "error"; r.note = e?.message ?? "Unknown error"; errors++;
      }
      bump(i, updated);
    }
    setResults({ companiesCreated: created, companiesLinked: linked, skipped, errors, total: updated.length });
    toast.success("Companies import complete");
  };

  const importProspects = async () => {
    const updated = [...rows];
    const companyCache = new Map<string, string>();
    let coCreated = 0, coLinked = 0, contactsCreated = 0, contactsSkipped = 0, namesExtracted = 0, errors = 0, skipped = 0;
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      if (r.status === "invalid") { skipped++; bump(i, updated); continue; }
      try {
        const m = r.mapped;
        const companyName = m.company!.trim();
        const email = m.email!.trim().toLowerCase();
        const cacheKey = companyName.toLowerCase();
        let crmCompanyId: string;
        if (companyCache.has(cacheKey)) {
          crmCompanyId = companyCache.get(cacheKey)!;
          coLinked++;
        } else {
          const { data: existingCo } = await supabase
            .from("crm_companies").select("id").ilike("name", companyName).maybeSingle();
          if (existingCo) {
            crmCompanyId = existingCo.id;
            coLinked++;
          } else {
            const domain = email.split("@")[1] || null;
            const companyType = /supplier/i.test(m.leadType ?? "") ? "supplier" : "buyer";
            const { data: newCo, error: coErr } = await supabase.from("crm_companies").insert({
              name: companyName,
              domain,
              company_type: companyType,
              country: m.country && m.country.toLowerCase() !== "unknown" ? m.country : null,
              city: m.city || null,
              state: m.state || null,
              address: m.address || null,
              postal_code: m.postalCode || null,
              industry: m.industry || null,
              website: m.website || null,
              linkedin_url: m.companyLinkedin || null,
              stage: "cold",
              source: "csv_import",
              source_detail: fileName,
              status: "active",
            } as any).select("id").single();
            if (coErr || !newCo) throw coErr ?? new Error("crm_company_create_failed");
            crmCompanyId = newCo.id;
            coCreated++;
          }
          companyCache.set(cacheKey, crmCompanyId);
        }
        // dedup contact
        const { data: existingContact } = await supabase
          .from("crm_contacts").select("id").ilike("email", email).maybeSingle();
        if (existingContact) {
          r.status = "skipped"; r.note = "Contact email exists";
          contactsSkipped++;
          bump(i, updated); continue;
        }
        let contactName = (m.fullName ?? "").trim();
        if (!contactName) {
          contactName = extractNameFromEmail(email);
          if (contactName) namesExtracted++;
        }
        const finalName = contactName || "Unknown";
        const parts = finalName.split(" ");
        const { error: ctErr } = await supabase.from("crm_contacts").insert({
          company_id: crmCompanyId,
          full_name: finalName,
          first_name: parts[0] || null,
          last_name: parts.slice(1).join(" ") || null,
          email,
          secondary_email: m.additionalEmail?.trim() || null,
          phone: m.phone?.trim() || null,
          mobile: m.mobile?.trim() || null,
          linkedin: m.personalLinkedin?.trim() || null,
          job_title: m.jobTitle?.trim() || null,
          decision_level: m.decisionLevel || null,
          country: m.country && m.country.toLowerCase() !== "unknown" ? m.country : null,
          city: m.city || null,
          lead_status: "new",
          source: "csv_import",
          source_detail: fileName,
          status: "active",
        } as any);
        if (ctErr) throw ctErr;
        contactsCreated++;
        r.status = "created"; r.note = "Imported";
      } catch (e: any) {
        r.status = "error"; r.note = e?.message ?? "Unknown error"; errors++;
      }
      bump(i, updated);
    }
    setResults({
      contactsCreated, contactsSkipped, companiesCreated: coCreated,
      companiesLinked: coLinked, namesExtracted, errors, skipped, total: updated.length,
    });
    auditLog({
      action: "import.prospects_imported", category: "system",
      entityType: "import", entityLabel: fileName,
      details: { contactsCreated, companiesCreated: coCreated, file: fileName },
    });
    toast.success(`Imported ${contactsCreated} prospects`);
  };

  const bump = (i: number, arr: ParsedRow[]) => {
    setProgress(Math.round(((i + 1) / arr.length) * 100));
    setRows([...arr]);
  };

  // ---- UI ----------------------------------------------------------------

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <Download size={22} color="#791f1f" />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1c1917", margin: 0 }}>Import Data</h1>
      </div>
      <p style={{ color: "#5e5e58", fontSize: 13, marginTop: 0, marginBottom: 20 }}>
        Import companies, team members, and prospects from spreadsheets (.xlsx / .csv).
      </p>

      {/* Step 1: destination */}
      <SectionTitle n={1} label="Choose destination" />
      <div className="import-destination-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <DestCard
          active={destination === "companies"} onClick={() => { setDestination("companies"); reset(); }}
          accent="#8B2252" bgActive="#FDF2F8" emoji="🏢" title="Companies"
          desc="Registered clients — creates company + team members. For buyers and suppliers already closed with Mundus."
        />
        <DestCard
          active={destination === "prospects"} onClick={() => { setDestination("prospects"); reset(); }}
          accent="#2563EB" bgActive="#EFF6FF" emoji="🎯" title="Prospects"
          desc="CRM leads — creates prospect companies + contacts. For leads to be enriched and nurtured."
        />
      </div>

      {/* Step 2: upload */}
      {destination && (
        <>
          <SectionTitle n={2} label="Upload file" />
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed rgba(121,31,31,0.35)", borderRadius: 10, padding: 28,
              textAlign: "center", cursor: "pointer", background: "#fdf6f6", marginBottom: 20,
            }}
          >
            <FileSpreadsheet size={32} color="#791f1f" />
            <div style={{ fontWeight: 600, marginTop: 8 }}>
              {fileName ? fileName : "Drop or click to upload .xlsx / .csv"}
            </div>
            <div style={{ fontSize: 12, color: "#5e5e58", marginTop: 4 }}>
              {destination === "companies"
                ? "Expected columns: User, Email, Company, Country, Business Type, Profile Type"
                : "Expected columns: Company, Email, Full Name, Job Title, Phone, Country, City, LinkedIn…"}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </div>
        </>
      )}

      {/* Step 3: mapping */}
      {headers.length > 0 && (
        <>
          <SectionTitle n={3} label="Map columns" />
          <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: 12, background: "white", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {headers.map((h) => (
                <div key={h} className="import-mapping-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: "#1c1917" }}>{h}</div>
                  <ArrowRightThin />
                  <select
                    value={mapping[h] ?? "ignore"}
                    onChange={(e) => onMappingChange(h, e.target.value as any)}
                    style={{ flex: 1, padding: "6px 8px", border: "1px solid #d6d3d1", borderRadius: 6, fontSize: 13 }}
                  >
                    <option value="ignore">— ignore —</option>
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step 4: preview + stats */}
      {rows.length > 0 && (
        <>
          <SectionTitle n={4} label="Preview" />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#5e5e58", marginBottom: 10 }}>
            <span><strong>{stats.total}</strong> rows detected</span>
            <span>·</span>
            <span><strong>{stats.uniqueCompanies}</strong> unique companies</span>
            <span>·</span>
            <span><strong>{stats.dupEmails}</strong> duplicate emails</span>
            <span>·</span>
            <span style={{ color: stats.invalid ? "#b91c1c" : "#16a34a" }}>
              <strong>{stats.ready}</strong> ready / <strong>{stats.invalid}</strong> invalid
            </span>
          </div>
          <div className="import-preview-table" style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "auto", background: "white", marginBottom: 16, maxHeight: 360 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ background: "#faf3f3", borderBottom: "1px solid rgba(0,0,0,0.08)", position: "sticky", top: 0 }}>
                <tr>
                  <th style={th()}>#</th>
                  <th style={th()}>Status</th>
                  {fields.slice(0, 6).map((f) => <th key={f.key} style={th()}>{f.label}</th>)}
                  <th style={th()}>Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r) => (
                  <tr key={r.index} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <td style={td()}>{r.index}</td>
                    <td style={td()}><StatusPill status={r.status} /></td>
                    {fields.slice(0, 6).map((f) => (
                      <td key={f.key} style={td()}>{r.mapped[f.key] ?? "—"}</td>
                    ))}
                    <td style={{ ...td(), color: "#5e5e58" }}>{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Step 5: import */}
          <SectionTitle n={5} label="Run import" />
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <button
              onClick={runImport} disabled={importing || stats.ready === 0}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 18px", background: destination === "prospects" ? "#2563EB" : "#791f1f",
                color: "white", border: 0, borderRadius: 6, fontWeight: 600,
                cursor: importing ? "wait" : "pointer", opacity: importing || stats.ready === 0 ? 0.7 : 1,
              }}
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? `Importing… ${progress}%` : `Import ${stats.ready} rows to ${destination}`}
            </button>
          </div>
          {importing && (
            <div style={{ height: 6, background: "#f5e6e6", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: destination === "prospects" ? "#2563EB" : "#791f1f", transition: "width .25s" }} />
            </div>
          )}
        </>
      )}

      {/* Results */}
      {done && (
        <div style={{ border: "1px solid #d1fae5", background: "#ecfdf5", borderRadius: 10, padding: 16, marginTop: 8 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#065f46" }}>Import complete</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#1c1917", lineHeight: 1.7 }}>
            {destination === "prospects" ? (
              <>
                <li>✅ <strong>{results.contactsCreated ?? 0}</strong> contacts created</li>
                <li>🏢 <strong>{results.companiesCreated ?? 0}</strong> companies created · 🔗 <strong>{results.companiesLinked ?? 0}</strong> linked</li>
                <li>⚠️ <strong>{results.contactsSkipped ?? 0}</strong> duplicate emails skipped</li>
                <li>📊 <strong>{results.namesExtracted ?? 0}</strong> names auto-extracted from email</li>
                <li>❌ <strong>{results.errors ?? 0}</strong> errors · <strong>{results.skipped ?? 0}</strong> invalid skipped</li>
              </>
            ) : (
              <>
                <li>✅ <strong>{results.companiesCreated ?? 0}</strong> companies created · 🔗 <strong>{results.companiesLinked ?? 0}</strong> linked</li>
                <li>⚠️ <strong>{results.skipped ?? 0}</strong> skipped</li>
                <li>❌ <strong>{results.errors ?? 0}</strong> errors</li>
              </>
            )}
          </ul>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {destination === "prospects" ? (
              <Link to="/admin/crm/prospects" style={btnPrimary("#2563EB")}>View in Prospects →</Link>
            ) : (
              <Link to="/admin/companies" style={btnPrimary("#791f1f")}>View Companies →</Link>
            )}
            <button onClick={() => { reset(); }} style={btnOutline()}>Import another file</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- helpers ----------------------------------------------------------------

function buildRow(index: number, raw: any, map: Record<string, FieldKey | "ignore">, required: FieldKey[]): ParsedRow {
  const mapped: Partial<Record<FieldKey, string>> = {};
  for (const k of Object.keys(raw)) {
    const tgt = map[k];
    if (!tgt || tgt === "ignore") continue;
    const v = String(raw[k] ?? "").trim();
    if (v) mapped[tgt] = v;
  }
  let status: RowStatus = "ready";
  let note: string | undefined;
  if (mapped.email && !isEmail(mapped.email)) {
    status = "invalid"; note = "Invalid email";
  } else {
    for (const req of required) {
      if (!mapped[req]) {
        if (req === "fullName" && mapped.email) {
          status = "warn"; note = "Name will be auto-extracted from email";
        } else {
          status = "invalid"; note = `Missing ${req}`;
          break;
        }
      }
    }
  }
  return { index, __raw: raw, status, note, mapped };
}

function th(): React.CSSProperties {
  return { padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#1c1917", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 };
}
function td(): React.CSSProperties {
  return { padding: "6px 10px", verticalAlign: "top" };
}
function btnPrimary(bg: string): React.CSSProperties {
  return { background: bg, color: "white", padding: "8px 14px", borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: "none", display: "inline-block" };
}
function btnOutline(): React.CSSProperties {
  return { background: "white", color: "#1c1917", padding: "8px 14px", borderRadius: 6, fontWeight: 600, fontSize: 13, border: "1px solid #d6d3d1", cursor: "pointer" };
}

function SectionTitle({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#791f1f", color: "white", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
    </div>
  );
}

function DestCard({ active, onClick, accent, bgActive, emoji, title, desc }: {
  active: boolean; onClick: () => void; accent: string; bgActive: string;
  emoji: string; title: string; desc: string;
}) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        padding: 24, borderRadius: 16, textAlign: "left", cursor: "pointer",
        border: active ? `2px solid ${accent}` : "1px solid #E5E7EB",
        background: active ? bgActive : "white",
        transition: "all .15s ease",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#1c1917" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
    </button>
  );
}

function ArrowRightThin() {
  return <span style={{ color: "#9ca3af", fontSize: 14 }}>→</span>;
}

function StatusPill({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; bg: string; color: string; Icon: any }> = {
    ready:   { label: "Ready",   bg: "#ecfdf5", color: "#065f46", Icon: CheckCircle2 },
    warn:    { label: "Warn",    bg: "#fef3c7", color: "#92400e", Icon: AlertTriangle },
    invalid: { label: "Invalid", bg: "#fee2e2", color: "#991b1b", Icon: XCircle },
    created: { label: "Created", bg: "#dcfce7", color: "#166534", Icon: CheckCircle2 },
    linked:  { label: "Linked",  bg: "#dbeafe", color: "#1e40af", Icon: CheckCircle2 },
    skipped: { label: "Skipped", bg: "#f5f5f4", color: "#57534e", Icon: AlertTriangle },
    error:   { label: "Error",   bg: "#fee2e2", color: "#991b1b", Icon: XCircle },
  };
  const { label, bg, color, Icon } = map[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      <Icon size={11} /> {label}
    </span>
  );
}