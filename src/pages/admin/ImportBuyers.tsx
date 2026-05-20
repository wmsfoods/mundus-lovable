import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ImportRecord = {
  company: string;
  domain: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  job_title?: string;
  country?: string;
  city?: string;
  state?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
};

const IMPORT_DATA: ImportRecord[] = [
  {
    company: "Test Corp",
    domain: "testcorp.com",
    email: "john@testcorp.com",
    first_name: "John",
    last_name: "Doe",
    full_name: "John Doe",
    job_title: "Head of Procurement",
    country: "US",
    city: "New York",
    state: "NY",
    website: "https://testcorp.com",
  },
  {
    company: "Acme Meats",
    domain: "acmemeats.com",
    email: "buyer@acmemeats.com",
    first_name: "Jane",
    last_name: "Smith",
    full_name: "Jane Smith",
    job_title: "Import Manager",
    country: "BR",
    city: "São Paulo",
    website: "https://acmemeats.com",
  },
  {
    company: "Global Foods Ltd",
    domain: "globalfoods.co.uk",
    email: "purchasing@globalfoods.co.uk",
    first_name: "Oliver",
    last_name: "Brown",
    full_name: "Oliver Brown",
    job_title: "Senior Buyer",
    country: "GB",
    city: "London",
    website: "https://globalfoods.co.uk",
  },
];

type Stats = { success: number; skipped: number; errors: number; total: number };

export default function ImportBuyers() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<Stats>({ success: 0, skipped: 0, errors: 0, total: 0 });
  const [log, setLog] = useState<string[]>([]);

  const append = (msg: string) => setLog((l) => [...l, msg]);

  async function run() {
    setRunning(true);
    setProgress(0);
    setLog([]);
    const s: Stats = { success: 0, skipped: 0, errors: 0, total: IMPORT_DATA.length };
    setStats(s);

    // 1. Dedup companies by domain
    const uniqueDomains = Array.from(new Set(IMPORT_DATA.map((r) => r.domain.toLowerCase())));
    const companyIdByDomain = new Map<string, string>();

    for (const domain of uniqueDomains) {
      const rec = IMPORT_DATA.find((r) => r.domain.toLowerCase() === domain)!;
      try {
        const { data: existing } = await supabase
          .from("crm_companies")
          .select("id")
          .eq("domain", domain)
          .maybeSingle();

        if (existing?.id) {
          companyIdByDomain.set(domain, existing.id);
          append(`↺ company exists: ${rec.company}`);
          continue;
        }

        const { data: inserted, error } = await supabase
          .from("crm_companies")
          .insert({
            name: rec.company,
            domain,
            website: rec.website ?? `https://${domain}`,
            country: rec.country ?? null,
            city: rec.city ?? null,
            state: rec.state ?? null,
            company_type: "buyer",
            stage: "cold",
            source: "csv_import",
          })
          .select("id")
          .single();

        if (error) throw error;
        companyIdByDomain.set(domain, inserted!.id);
        append(`✓ company created: ${rec.company}`);
      } catch (e: any) {
        append(`✗ company error (${rec.company}): ${e.message}`);
      }
    }

    // 2. Insert contacts (dedup by email)
    for (let i = 0; i < IMPORT_DATA.length; i++) {
      const r = IMPORT_DATA[i];
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
          const company_id = companyIdByDomain.get(r.domain.toLowerCase()) ?? null;
          const { error } = await supabase.from("crm_contacts").insert({
            full_name:
              r.full_name ||
              `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() ||
              email,
            first_name: r.first_name ?? null,
            last_name: r.last_name ?? null,
            email,
            job_title: r.job_title ?? null,
            country: r.country ?? null,
            city: r.city ?? null,
            state: r.state ?? null,
            phone: r.phone ?? null,
            linkedin: r.linkedin ?? null,
            company_id,
            source: "csv_import",
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
      setProgress(Math.round(((i + 1) / IMPORT_DATA.length) * 100));
    }

    // 3. Log import
    try {
      await supabase.from("crm_import_logs").insert({
        import_type: "buyer_csv",
        status: "completed",
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Buyers</h1>
        <p className="text-sm text-muted-foreground">
          Internal tool. {IMPORT_DATA.length} records loaded.
        </p>
      </div>

      <Button onClick={run} disabled={running}>
        {running ? "Importing…" : "Run Buyer Import"}
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