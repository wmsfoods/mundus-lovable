import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/auditLog";

type Destination = "companies" | "prospects";
type RowStatus = "ready" | "warn" | "invalid" | "created" | "linked" | "skipped" | "error";
type LeadType = "buyer" | "supplier" | "c_level";

// ---- Field schemas ----------------------------------------------------------

type FieldKey =
  // shared
  | "company" | "country" | "email" | "fullName" | "phone" | "mobile"
  | "city" | "state" | "address" | "postalCode" | "website" | "linkedin"
  // company-only
  | "businessType" | "profileType"
  // prospect-only
  | "jobTitle" | "personalLinkedin" | "companyLinkedin" | "industry"
  | "additionalEmail" | "decisionLevel" | "leadType" | "supplierType";

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
  { key: "supplierType",    label: "Supplier Type / Category" },
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
  "industry": "industry", "category": "industry",
  "job title": "jobTitle", "title": "jobTitle", "role/job title": "jobTitle", "role": "jobTitle",
  "position": "jobTitle",
  "role / title": "jobTitle", "role / job title": "jobTitle", "role title": "jobTitle",
  "decision level": "decisionLevel", "seniority": "decisionLevel",
  "lead type": "leadType",
  "business type": "businessType", "business": "businessType", "type": "businessType",
  "profile type": "profileType", "profile": "profileType",
  "supplier type": "supplierType",
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

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "live.com", "mail.com", "yandex.com", "protonmail.com",
  "nate.com", "naver.com", "qq.com", "163.com", "msn.com", "me.com",
]);
function isGenericDomain(domain: string): boolean {
  return GENERIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

interface RawRow { __raw: Record<string, string> }

interface ParsedRow extends RawRow {
  index: number;
  status: RowStatus;
  note?: string;
  mapped: Partial<Record<FieldKey, string>>;
}

// ---- Grouping types --------------------------------------------------------

interface GroupedContact {
  fullName: string;
  email: string | null;
  phone?: string;
  mobile?: string;
  roleTitle?: string;
  additionalEmail?: string;
  linkedin?: string;
}
interface GroupedCompany {
  companyName: string;
  country?: string; city?: string; state?: string; street?: string; zipCode?: string;
  website?: string; industry?: string; supplierType?: string;
  mainContact: GroupedContact | null;
  additionalContacts: GroupedContact[];
  companyOnly: boolean;
}
interface GroupStats {
  totalRows: number; duplicateEmails: number; mergedCompanies: number;
  companyOnly: number; totalContacts: number; noEmailContacts?: number;
}

function groupAndDedup(rows: ParsedRow[], opts?: { allowNoEmail?: boolean }): { groups: GroupedCompany[]; stats: GroupStats } {
  const allowNoEmail = !!opts?.allowNoEmail;
  const stats: GroupStats = { totalRows: rows.length, duplicateEmails: 0, mergedCompanies: 0, companyOnly: 0, totalContacts: 0, noEmailContacts: 0 };
  const scoreOf = (r: ParsedRow) => Object.values(r.mapped).filter((v) => v != null && v !== "").length;

  // Step 1: dedup by email keeping highest-data row
  const seen = new Map<string, ParsedRow>();
  const deduped: ParsedRow[] = [];
  for (const r of rows) {
    const em = r.mapped.email?.trim().toLowerCase();
    if (!em) { deduped.push(r); continue; }
    const existing = seen.get(em);
    if (existing) {
      stats.duplicateEmails++;
      if (scoreOf(r) > scoreOf(existing)) {
        seen.set(em, r);
        const idx = deduped.findIndex((x) => x.mapped.email?.trim().toLowerCase() === em);
        if (idx >= 0) deduped[idx] = r;
      }
      continue;
    }
    seen.set(em, r);
    deduped.push(r);
  }

  // Step 2: group by company
  const byCo = new Map<string, ParsedRow[]>();
  for (const r of deduped) {
    const key = (r.mapped.company ?? "").trim().toLowerCase();
    if (!key) continue;
    if (!byCo.has(key)) byCo.set(key, []);
    byCo.get(key)!.push(r);
  }

  const groups: GroupedCompany[] = [];
  for (const [, list] of byCo) {
    if (list.length > 1) stats.mergedCompanies++;
    const best = [...list].sort((a, b) => scoreOf(b) - scoreOf(a))[0];
    const m = best.mapped;
    const contactRows = list.filter((r) =>
      r.mapped.email || (allowNoEmail && (r.mapped.fullName || r.mapped.personalLinkedin))
    );
    const hasContacts = contactRows.length > 0;

    const resolve = (r: ParsedRow): GroupedContact => {
      let name = (r.mapped.fullName ?? "").trim();
      if (!name && r.mapped.email) name = extractNameFromEmail(r.mapped.email);
      return {
        fullName: name || "Unknown",
        email: r.mapped.email ? r.mapped.email.trim().toLowerCase() : null,
        phone: r.mapped.phone?.trim() || undefined,
        mobile: r.mapped.mobile?.trim() || undefined,
        roleTitle: r.mapped.jobTitle?.trim() || undefined,
        additionalEmail: r.mapped.additionalEmail?.trim() || undefined,
        linkedin: r.mapped.personalLinkedin?.trim() || undefined,
      };
    };

    let mainContact: GroupedContact | null = null;
    const additional: GroupedContact[] = [];
    if (hasContacts) {
      const sorted = [...contactRows].sort((a, b) => {
        const an = a.mapped.fullName ? 1 : 0, bn = b.mapped.fullName ? 1 : 0;
        if (an !== bn) return bn - an;
        return scoreOf(b) - scoreOf(a);
      });
      mainContact = resolve(sorted[0]);
      for (let i = 1; i < sorted.length; i++) additional.push(resolve(sorted[i]));
      stats.totalContacts += 1 + additional.length;
      const noEmailCount = sorted.filter((r) => !r.mapped.email).length;
      stats.noEmailContacts = (stats.noEmailContacts ?? 0) + noEmailCount;
    } else {
      stats.companyOnly++;
    }

    groups.push({
      companyName: (m.company ?? "").trim(),
      country: m.country?.trim() || undefined,
      city: m.city?.trim() || undefined,
      state: m.state?.trim() || undefined,
      street: m.address?.trim() || undefined,
      zipCode: m.postalCode?.trim() || undefined,
      website: m.website?.trim() || undefined,
      industry: m.industry?.trim() || undefined,
      supplierType: m.supplierType?.trim() || undefined,
      mainContact,
      additionalContacts: additional,
      companyOnly: !hasContacts,
    });
  }

  return { groups, stats };
}

// ---- Component --------------------------------------------------------------

export default function AdminImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [leadType, setLeadType] = useState<LeadType>("buyer");
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "ignore">>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [groups, setGroups] = useState<GroupedCompany[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<Record<string, number>>({});

  const fields = destination === "prospects" ? PROSPECT_FIELDS : COMPANY_FIELDS;
  const requiredKeys = fields.filter((f) => f.required).map((f) => f.key);

  const reset = () => {
    setFileName(""); setHeaders([]); setMapping({}); setRows([]);
    setGroups([]); setGroupStats(null);
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

      // Auto-detect lead type from data (if "Lead Type" column present)
      if (destination === "prospects") {
        const types = parsed.map((p) => p.mapped.leadType?.toLowerCase()).filter(Boolean) as string[];
        if (types.length > 0) {
          const cLevelCount = types.filter((t) => /c[\s\-_]?level|^c-?suite/.test(t)).length;
          const supplierCount = types.filter((t) => /supplier|vendor/.test(t)).length;
          if (cLevelCount > types.length / 2) setLeadType("c_level");
          else if (supplierCount > types.length / 2) setLeadType("supplier");
          else setLeadType("buyer");
        }
        // Also auto-detect via job title pattern (CEO, CFO, COO, CTO, Founder)
        const titles = parsed.map((p) => (p.mapped.jobTitle ?? "").toLowerCase()).filter(Boolean);
        if (titles.length > 0 && types.length === 0) {
          const cTitles = titles.filter((t) => /\b(ceo|cfo|coo|cto|cmo|cio|chro|president|founder|owner|managing director)\b/.test(t)).length;
          if (cTitles > titles.length * 0.6) setLeadType("c_level");
        }
        const g = groupAndDedup(parsed, { allowNoEmail: true });
        setGroups(g.groups);
        setGroupStats(g.stats);
      }

      toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
    } catch (e: any) {
      toast.error("Failed to parse file: " + (e?.message ?? "unknown"));
    }
  };

  const onMappingChange = (header: string, value: FieldKey | "ignore") => {
    const next = { ...mapping, [header]: value };
    setMapping(next);
    const updated = rows.map((r) => buildRow(r.index, r.__raw, next, requiredKeys));
    setRows(updated);
    if (destination === "prospects") {
      const g = groupAndDedup(updated, { allowNoEmail: true });
      setGroups(g.groups);
      setGroupStats(g.stats);
    }
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
    else if (leadType === "c_level") await importCLevels();
    else await importGroupedProspects();
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

  // Legacy per-row importer kept for reference (unused).
  const _importProspectsLegacy = async () => {
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

  const importCLevels = async () => {
    if (!groups.length) return;
    let companiesCreated = 0, companiesLinked = 0, contactsCreated = 0,
        contactsNoEmail = 0, contactsUpdated = 0, errors = 0;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      try {
        let crmCompanyId: string | null = null;
        const mainEmail = g.mainContact?.email ?? null;
        const domain = mainEmail ? mainEmail.split("@")[1] : null;

        // 1. Try by domain (skip generic)
        if (domain && !isGenericDomain(domain)) {
          const { data: byDomain } = await supabase
            .from("crm_companies").select("id").ilike("domain", domain).maybeSingle();
          if (byDomain) { crmCompanyId = byDomain.id; companiesLinked++; }
        }

        // 2. Try by company name
        if (!crmCompanyId && g.companyName) {
          const { data: byName } = await supabase
            .from("crm_companies").select("id").ilike("name", g.companyName.trim()).maybeSingle();
          if (byName) { crmCompanyId = byName.id; companiesLinked++; }
        }

        // 3. Create new company
        if (!crmCompanyId) {
          const websiteUrl = g.website
            ? (g.website.startsWith("http") ? g.website : `https://${g.website}`)
            : null;
          const { data: newCo, error } = await supabase.from("crm_companies").insert({
            name: g.companyName || "Unknown",
            domain: domain && !isGenericDomain(domain) ? domain : null,
            company_type: "prospect",
            country: g.country && g.country.toLowerCase() !== "unknown" ? g.country : null,
            city: g.city || null,
            state: g.state || null,
            website: websiteUrl,
            industry: g.industry || null,
            stage: "cold",
            source: "csv_import",
            source_detail: `C-Level import — ${fileName}`,
            status: "active",
          } as any).select("id").single();
          if (error || !newCo) throw error ?? new Error("crm_company_create_failed");
          crmCompanyId = newCo.id; companiesCreated++;
        }

        const allContacts = [
          ...(g.mainContact ? [g.mainContact] : []),
          ...g.additionalContacts,
        ];

        for (const c of allContacts) {
          try {
            // Dedup by email when present
            if (c.email) {
              const { data: existing } = await supabase
                .from("crm_contacts").select("id").ilike("email", c.email).maybeSingle();
              if (existing) {
                await supabase.from("crm_contacts").update({
                  seniority: "c_level",
                  contact_type: "decision_maker",
                  job_title: c.roleTitle || undefined,
                  linkedin: c.linkedin || undefined,
                } as any).eq("id", existing.id);
                contactsUpdated++;
                continue;
              }
            } else if (c.fullName) {
              const { data: byName } = await supabase
                .from("crm_contacts").select("id")
                .eq("company_id", crmCompanyId!)
                .ilike("full_name", c.fullName.trim())
                .maybeSingle();
              if (byName) {
                await supabase.from("crm_contacts").update({
                  seniority: "c_level",
                  contact_type: "decision_maker",
                  job_title: c.roleTitle || undefined,
                  linkedin: c.linkedin || undefined,
                } as any).eq("id", byName.id);
                contactsUpdated++;
                continue;
              }
            }

            const parts = (c.fullName || "Unknown").split(" ");
            const { error: ctErr } = await supabase.from("crm_contacts").insert({
              company_id: crmCompanyId!,
              full_name: c.fullName || "Unknown",
              first_name: parts[0] || null,
              last_name: parts.slice(1).join(" ") || null,
              email: c.email,
              phone: c.phone || null,
              mobile: c.mobile || null,
              linkedin: c.linkedin || null,
              job_title: c.roleTitle || null,
              seniority: "c_level",
              contact_type: "decision_maker",
              country: g.country && g.country.toLowerCase() !== "unknown" ? g.country : null,
              city: g.city || null,
              lead_status: "new",
              source: "csv_import",
              source_detail: `C-Level import — ${fileName}`,
              status: "active",
            } as any);
            if (ctErr) throw ctErr;
            if (c.email) contactsCreated++;
            else contactsNoEmail++;
          } catch (e: any) {
            errors++;
            console.error("[C-Level] contact insert:", c.fullName, e?.message);
          }
        }
      } catch (e: any) {
        errors++;
        console.error("[C-Level] company:", g.companyName, e?.message);
      }
      setProgress(Math.round(((i + 1) / groups.length) * 100));
    }
    setResults({
      companiesCreated, companiesLinked, contactsCreated, contactsNoEmail,
      contactsUpdated, errors, total: groups.length,
    });
    auditLog({
      action: "import.c_level_imported", category: "system",
      entityType: "import", entityLabel: fileName,
      details: { companiesCreated, companiesLinked, contactsCreated, contactsNoEmail, contactsUpdated, file: fileName },
    });
    toast.success(`Imported ${companiesCreated + companiesLinked} companies, ${contactsCreated + contactsNoEmail} C-Level contacts`);
  };

  const importGroupedProspects = async () => {
    if (!groups.length) return;
    let companiesCreated = 0, companiesLinked = 0, contactsCreated = 0, additionalCreated = 0, companyOnly = 0, errors = 0;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      try {
        // Dedup company by name
        const { data: existingCo } = await supabase
          .from("crm_companies").select("id").ilike("name", g.companyName).maybeSingle();
        let crmCompanyId: string;
        if (existingCo) {
          crmCompanyId = existingCo.id; companiesLinked++;
        } else {
          const domain = g.mainContact?.email?.split("@")[1]
            || g.website?.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
            || null;
          const websiteUrl = g.website
            ? (g.website.startsWith("http") ? g.website : `https://${g.website}`)
            : null;
          const { data: newCo, error } = await supabase.from("crm_companies").insert({
            name: g.companyName,
            domain,
            company_type: leadType,
            country: g.country && g.country.toLowerCase() !== "unknown" ? g.country : null,
            city: g.city || null,
            state: g.state || null,
            address: g.street || null,
            postal_code: g.zipCode || null,
            industry: g.industry || null,
            website: websiteUrl,
            company_size: g.supplierType || null,
            stage: "cold",
            source: "csv_import",
            source_detail: fileName,
            status: "active",
          } as any).select("id").single();
          if (error || !newCo) throw error ?? new Error("crm_company_create_failed");
          crmCompanyId = newCo.id; companiesCreated++;
        }

        const insertContact = async (c: GroupedContact) => {
          const { data: existing } = await supabase
            .from("crm_contacts").select("id").ilike("email", c.email).maybeSingle();
          if (existing) return false;
          const parts = c.fullName.split(" ");
          const { error } = await supabase.from("crm_contacts").insert({
            company_id: crmCompanyId,
            full_name: c.fullName,
            first_name: parts[0] || null,
            last_name: parts.slice(1).join(" ") || null,
            email: c.email,
            secondary_email: c.additionalEmail || null,
            phone: c.phone || null,
            mobile: c.mobile || null,
            job_title: c.roleTitle || null,
            country: g.country && g.country.toLowerCase() !== "unknown" ? g.country : null,
            city: g.city || null,
            lead_status: "new",
            source: "csv_import",
            source_detail: fileName,
            status: "active",
          } as any);
          if (error) throw error;
          return true;
        };

        if (g.mainContact) {
          if (await insertContact(g.mainContact)) contactsCreated++;
        }
        for (const ac of g.additionalContacts) {
          try { if (await insertContact(ac)) additionalCreated++; } catch { /* skip */ }
        }
        if (g.companyOnly) companyOnly++;
      } catch (e: any) {
        errors++;
        console.error("Import error:", g.companyName, e?.message);
      }
      setProgress(Math.round(((i + 1) / groups.length) * 100));
    }
    setResults({
      companiesCreated, companiesLinked, contactsCreated, additionalCreated,
      companyOnly, duplicateEmails: groupStats?.duplicateEmails ?? 0, errors,
      total: groups.length,
    });
    auditLog({
      action: "import.prospects_imported", category: "system",
      entityType: "import", entityLabel: fileName,
      details: { leadType, companiesCreated, contactsCreated, additionalCreated, file: fileName },
    });
    toast.success(`Imported ${companiesCreated} ${leadType} companies, ${contactsCreated + additionalCreated} contacts`);
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

      {destination === "prospects" && (
        <div style={{ display: "flex", gap: 12, marginTop: -8, marginBottom: 24 }}>
          <button onClick={() => setLeadType("buyer")} style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: leadType === "buyer" ? "2px solid #2563EB" : "1px solid #D1D5DB",
            background: leadType === "buyer" ? "#EFF6FF" : "white",
            color: leadType === "buyer" ? "#1D4ED8" : "#1c1917",
          }}>🛒 Buyers</button>
          <button onClick={() => setLeadType("supplier")} style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: leadType === "supplier" ? "2px solid #059669" : "1px solid #D1D5DB",
            background: leadType === "supplier" ? "#ECFDF5" : "white",
            color: leadType === "supplier" ? "#065F46" : "#1c1917",
          }}>🏭 Suppliers</button>
          <button onClick={() => setLeadType("c_level")} style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            border: leadType === "c_level" ? "2px solid #7C3AED" : "1px solid #D1D5DB",
            background: leadType === "c_level" ? "#F5F3FF" : "white",
            color: leadType === "c_level" ? "#6D28D9" : "#1c1917",
          }}>👔 C-Level</button>
        </div>
      )}

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
      {rows.length > 0 && destination !== "prospects" && (
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
                padding: "10px 18px", background: "#791f1f",
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
              <div style={{ height: "100%", width: `${progress}%`, background: "#791f1f", transition: "width .25s" }} />
            </div>
          )}
        </>
      )}

      {/* Grouped preview for prospects */}
      {destination === "prospects" && groups.length > 0 && groupStats && (
        <>
          <SectionTitle n={4} label={`Preview — ${leadType === "c_level" ? "C-Level Decision Makers" : leadType === "supplier" ? "Grouped Suppliers" : "Grouped Buyers"}`} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <GroupStat label={`📊 ${groupStats.totalRows} rows parsed`} />
            <GroupStat label={`🏢 ${groups.length} companies`} accent="#1D4ED8" bg="#EFF6FF" />
            <GroupStat label={`👤 ${groupStats.totalContacts} contacts`} accent="#065F46" bg="#ECFDF5" />
            {leadType === "c_level" && (groupStats.noEmailContacts ?? 0) > 0 && (
              <GroupStat label={`🔗 ${groupStats.noEmailContacts} LinkedIn-only (no email)`} accent="#6D28D9" bg="#F5F3FF" />
            )}
            <GroupStat label={`🔗 ${groupStats.mergedCompanies} merged (multi-contact)`} accent="#7C2D12" bg="#FEF3C7" />
            <GroupStat label={`⚠️ ${groupStats.duplicateEmails} duplicate emails removed`} accent="#92400E" bg="#FEF3C7" />
            <GroupStat label={`📭 ${groupStats.companyOnly} company-only`} accent="#57534E" bg="#F5F5F4" />
          </div>
          <div className="import-preview-table" style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "auto", background: "white", marginBottom: 16, maxHeight: 420 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ background: "#faf3f3", borderBottom: "1px solid rgba(0,0,0,0.08)", position: "sticky", top: 0 }}>
                <tr>
                  <th style={th()}>#</th>
                  <th style={th()}>Company</th>
                  <th style={th()}>Country</th>
                  <th style={th()}>Main Contact</th>
                  <th style={th()}>Email</th>
                  <th style={th()}>Phone</th>
                  <th style={th()}>Additional</th>
                  <th style={th()}>Status</th>
                </tr>
              </thead>
              <tbody>
                {groups.slice(0, 100).map((g, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <td style={td()}>{i + 1}</td>
                    <td style={td()}>
                      <strong>{g.companyName}</strong>
                      {g.website && <div style={{ fontSize: 11, color: "#9CA3AF" }}>{g.website}</div>}
                    </td>
                    <td style={td()}>{g.country || "—"}</td>
                    <td style={td()}>{g.mainContact?.fullName || "—"}</td>
                    <td style={{ ...td(), fontSize: 12 }}>{g.mainContact?.email || "—"}</td>
                    <td style={{ ...td(), fontSize: 12 }}>{g.mainContact?.phone || "—"}</td>
                    <td style={td()}>
                      {g.additionalContacts.length > 0
                        ? <span style={{ background: "#DBEAFE", color: "#1D4ED8", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                            +{g.additionalContacts.length} contact{g.additionalContacts.length > 1 ? "s" : ""}
                          </span>
                        : "—"}
                    </td>
                    <td style={td()}>
                      {g.companyOnly
                        ? <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>Company only</span>
                        : <span style={{ background: "#D1FAE5", color: "#065F46", padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>✓ Ready</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionTitle n={5} label="Run import" />
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <button
              onClick={runImport} disabled={importing || groups.length === 0}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 18px", background: leadType === "supplier" ? "#059669" : "#2563EB",
                color: "white", border: 0, borderRadius: 6, fontWeight: 600,
                cursor: importing ? "wait" : "pointer", opacity: importing ? 0.7 : 1,
              }}
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? `Importing… ${progress}%` : `Import ${groups.length} ${leadType === "supplier" ? "supplier" : "buyer"} companies`}
            </button>
          </div>
          {importing && (
            <div style={{ height: 6, background: "#e0e7ff", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: leadType === "supplier" ? "#059669" : "#2563EB", transition: "width .25s" }} />
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
                <li>✅ <strong>{results.companiesCreated ?? 0}</strong> companies created · 🔗 <strong>{results.companiesLinked ?? 0}</strong> linked</li>
                <li>👤 <strong>{results.contactsCreated ?? 0}</strong> main contacts · 👥 <strong>{results.additionalCreated ?? 0}</strong> additional</li>
                <li>📭 <strong>{results.companyOnly ?? 0}</strong> company-only (no email)</li>
                <li>⚠️ <strong>{results.duplicateEmails ?? 0}</strong> duplicate emails removed</li>
                <li>❌ <strong>{results.errors ?? 0}</strong> errors</li>
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
        } else if (req === "email" && (mapped.fullName || mapped.personalLinkedin)) {
          status = "warn"; note = "No email — will import with LinkedIn / name only";
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

function GroupStat({ label, accent = "#1c1917", bg = "#F5F5F4" }: { label: string; accent?: string; bg?: string }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 10, background: bg, color: accent, fontSize: 12, fontWeight: 600 }}>
      {label}
    </div>
  );
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