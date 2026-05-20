import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ImportRecord = {
  company: string;
  domain: string | null;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  job_title?: string;
  country?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  personal_linkedin?: string;
  secondary_email?: string;
  industry?: string;
  website?: string;
  decision_level?: string;
};

const COLUMN_MAP: Record<string, keyof ImportRecord> = {
  "company name": "company",
  "domain": "domain",
  "email": "email",
  "full name": "full_name",
  "first name": "first_name",
  "last name": "last_name",
  "role / job title": "job_title",
  "role/job title": "job_title",
  "job title": "job_title",
  "country": "country",
  "city": "city",
  "state": "state",
  "zip code": "zip_code",
  "street": "address",
  "phone": "phone",
  "mobile": "mobile",
  "personal linkedin": "personal_linkedin",
  "additional email": "secondary_email",
  "industry": "industry",
  "website": "website",
  "decision level": "decision_level",
};

type Stats = { success: number; skipped: number; errors: number; total: number };

function clean(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

function domainFromEmail(email?: string): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).toLowerCase().trim() || null;
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "yandex.com",
  "mail.com",
  "qq.com",
  "163.com",
]);

function normalizeRow(raw: Record<string, unknown>): ImportRecord | null {
  const out: Partial<ImportRecord> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = COLUMN_MAP[key.toLowerCase().trim()];
    if (mapped) (out as any)[mapped] = clean(value);
  }
  const email = (out.email || "").toLowerCase();
  if (!email) return null;
  const rawDomain = out.domain ? out.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] : null;
  const emailDomain = domainFromEmail(email);
  let domain: string | null = rawDomain || emailDomain;
  if (domain && FREE_EMAIL_DOMAINS.has(domain)) domain = null;
  const company = out.company || (domain ?? "") || email;
  return { ...(out as ImportRecord), email, domain, company };
}

export default function ImportBuyers() {
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<Stats>({ success: 0, skipped: 0, errors: 0, total: 0 });
  const [log, setLog] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const append = (msg: string) => setLog((l) => [...l, msg]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setLog([]);
    setProgress(0);
    setStats({ success: 0, skipped: 0, errors: 0, total: 0 });

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const parsed = rows.map(normalizeRow).filter((r): r is ImportRecord => !!r);
    setRecords(parsed);
    append(`Parsed ${parsed.length} records from ${file.name}`);
  }

  async function run() {
    if (!records.length) return;
    setRunning(true);
    setProgress(0);
    const s: Stats = { success: 0, skipped: 0, errors: 0, total: records.length };
    setStats(s);

    // 1. Dedup companies by domain OR by name (case-insensitive) when no domain
    type Key = { kind: "domain" | "name"; value: string };
    const keyFor = (r: ImportRecord): Key =>
      r.domain ? { kind: "domain", value: r.domain.toLowerCase() } : { kind: "name", value: r.company.toLowerCase().trim() };
    const keyStr = (k: Key) => `${k.kind}:${k.value}`;

    const uniqueCompanies = new Map<string, ImportRecord>();
    for (const r of records) {
      const k = keyStr(keyFor(r));
      if (!uniqueCompanies.has(k)) uniqueCompanies.set(k, r);
    }
    const companyIdByKey = new Map<string, string>();

    for (const [k, r] of uniqueCompanies) {
      try {
        const key = keyFor(r);
        let query = supabase.from("crm_companies").select("id");
        if (key.kind === "domain") query = query.eq("domain", key.value);
        else query = query.ilike("name", r.company);
        const { data: existing } = await query.maybeSingle();

        if (existing?.id) {
          companyIdByKey.set(k, existing.id);
          append(`↺ company exists: ${r.company}`);
          continue;
        }

        const { data: inserted, error } = await supabase
          .from("crm_companies")
          .insert({
            name: r.company,
            domain: r.domain,
            website: r.website ?? (r.domain ? `https://${r.domain}` : null),
            country: r.country ?? null,
            city: r.city ?? null,
            state: r.state ?? null,
            postal_code: r.zip_code ?? null,
            address: r.address ?? null,
            phone: r.phone ?? null,
            industry: r.industry ?? null,
            company_type: "buyer",
            stage: "cold",
            source: "csv_import",
          })
          .select("id")
          .single();

        if (error) throw error;
        companyIdByKey.set(k, inserted!.id);
        append(`✓ company created: ${r.company}`);
      } catch (e: any) {
        append(`✗ company error (${r.company}): ${e.message}`);
      }
    }

    // 2. Insert contacts (dedup by email)
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      try {
        const email = r.email.toLowerCase();
        const { data: existing } = await supabase
          .from("crm_contacts")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existing?.id) {
          s.skipped += 1;
          append(`↺ contact exists: ${email}`);
        } else {
          const company_id = companyIdByKey.get(keyStr(keyFor(r))) ?? null;
          const full_name =
            r.full_name ||
            `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() ||
            email;
          const { error } = await supabase.from("crm_contacts").insert({
            full_name,
            first_name: r.first_name ?? null,
            last_name: r.last_name ?? null,
            email,
            secondary_email: r.secondary_email ?? null,
            job_title: r.job_title ?? null,
            decision_level: r.decision_level ?? null,
            country: r.country ?? null,
            city: r.city ?? null,
            state: r.state ?? null,
            phone: r.phone ?? null,
            mobile: r.mobile ?? null,
            personal_linkedin: r.personal_linkedin ?? null,
            company_id,
            source: "csv_import",
            lead_source: "csv_import",
            lead_status: "new",
            buyer_type: "Importer",
            contact_type: "buyer",
          });
          if (error) throw error;
          s.success += 1;
          append(`✓ contact: ${email}`);
        }
      } catch (e: any) {
        s.errors += 1;
        append(`✗ contact error (${r.email}): ${e.message}`);
      }
      setStats({ ...s });
      setProgress(Math.round(((i + 1) / records.length) * 100));
    }

    try {
      await supabase.from("crm_import_logs").insert({
        import_type: "buyer_csv",
        status: "completed",
        file_name: fileName,
        total_records: s.total,
        imported: s.success,
        duplicates_skipped: s.skipped,
        errors: s.errors,
        completed_at: new Date().toISOString(),
      });
    } catch {
      /* ignore */
    }

    setRunning(false);
  }

  const preview = records.slice(0, 5);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Buyers</h1>
        <p className="text-sm text-muted-foreground">
          Upload a cleaned .xlsx or .csv file. Internal tool.
        </p>
      </div>

      <div className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          disabled={running}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:hover:bg-muted"
        />
        {fileName && (
          <div className="text-xs text-muted-foreground">
            {fileName} — {records.length} valid records
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1.5 text-left">Company</th>
                <th className="px-2 py-1.5 text-left">Domain</th>
                <th className="px-2 py-1.5 text-left">Name</th>
                <th className="px-2 py-1.5 text-left">Email</th>
                <th className="px-2 py-1.5 text-left">Country</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5">{r.company}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.domain ?? "—"}</td>
                  <td className="px-2 py-1.5">{r.full_name || `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()}</td>
                  <td className="px-2 py-1.5">{r.email}</td>
                  <td className="px-2 py-1.5">{r.country ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button onClick={run} disabled={running || !records.length}>
        {running ? "Importing…" : `Run Buyer Import (${records.length})`}
      </Button>

      {(running || progress > 0) && (
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="text-sm text-muted-foreground">
            {stats.success + stats.skipped + stats.errors} of {stats.total}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Success</div>
          <div className="text-xl font-semibold text-emerald-600">{stats.success}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Skipped</div>
          <div className="text-xl font-semibold text-amber-600">{stats.skipped}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Errors</div>
          <div className="text-xl font-semibold text-rose-600">{stats.errors}</div>
        </div>
      </div>

      {log.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 max-h-80 overflow-auto text-xs font-mono space-y-1">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}