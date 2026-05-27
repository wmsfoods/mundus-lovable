import { supabase } from "@/integrations/supabase/client";

export interface EnrichableContact {
  id: string;
  company_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  linkedin?: string | null;
  photo_url?: string | null;
  city?: string | null;
  country?: string | null;
  job_title?: string | null;
  seniority?: string | null;
  department?: string | null;
}

const SENIORITY_MAP: Record<string, string> = {
  c_suite: "c_level",
  vp: "vp",
  director: "director",
  manager: "manager",
  senior: "senior",
  entry: "entry",
};

export interface EnrichResult {
  ok: boolean;
  error?: string;
  updatedFields?: string[];
  fullName?: string | null;
}

/**
 * Enrich a single CRM contact via Apollo (prospect-enrich edge function).
 * Only fills empty fields. Also updates the parent company if Apollo returns org data.
 */
export async function enrichContact(contact: EnrichableContact): Promise<EnrichResult> {
  let companyName: string | null = null;
  let companyDomain: string | null = null;
  let companyWebsite: string | null = null;
  let companyLinkedin: string | null = null;

  if (contact.company_id) {
    const { data: co } = await supabase
      .from("crm_companies")
      .select("name,domain,website,linkedin_url")
      .eq("id", contact.company_id)
      .maybeSingle();
    if (co) {
      companyName = co.name ?? null;
      companyDomain = co.domain ?? null;
      companyWebsite = co.website ?? null;
      companyLinkedin = co.linkedin_url ?? null;
    }
  }

  const { data, error } = await supabase.functions.invoke("prospect-enrich", {
    body: {
      first_name: contact.first_name,
      last_name: contact.last_name,
      name: contact.full_name,
      email: contact.email,
      organization_name: companyName,
      domain: companyDomain,
    },
  });

  if (error || !data?.ok) {
    return { ok: false, error: (data as any)?.error || error?.message || "enrich_failed" };
  }

  const person = (data as any).person ?? {};
  const updates: Record<string, any> = {
    apollo_person_id: person.id ?? null,
    apollo_enriched_at: new Date().toISOString(),
    apollo_person_payload: person,
  };

  if (!contact.full_name || contact.full_name === "Unknown") {
    if (person.name) updates.full_name = person.name;
    if (person.first_name) updates.first_name = person.first_name;
    if (person.last_name) updates.last_name = person.last_name;
  }
  if (!contact.job_title && person.title) updates.job_title = person.title;
  if (!contact.phone && person.sanitized_phone) updates.phone = person.sanitized_phone;
  if (!contact.linkedin && person.linkedin_url) updates.linkedin = person.linkedin_url;
  if (!contact.photo_url && person.photo_url) updates.photo_url = person.photo_url;
  if (!contact.city && person.city) updates.city = person.city;
  if (!contact.country && person.country) updates.country = person.country;
  if (!contact.seniority && person.seniority) {
    updates.seniority = SENIORITY_MAP[person.seniority] ?? "staff";
  }
  if (!contact.department && person.departments?.[0]) updates.department = person.departments[0];

  if (person.email_status) {
    updates.email_status = person.email_status === "valid" ? "verified" : person.email_status;
  }

  if (Array.isArray(person.phone_numbers) && person.phone_numbers.length) {
    const direct = person.phone_numbers.find((p: any) => p.type === "work_direct" || p.type === "work_hq");
    const mob = person.phone_numbers.find((p: any) => p.type === "mobile");
    if (direct && !contact.phone) updates.phone = direct.sanitized_number;
    if (mob && !contact.mobile) updates.mobile = mob.sanitized_number;
  }

  await supabase.from("crm_contacts").update(updates).eq("id", contact.id);

  if (person.organization && contact.company_id) {
    const org = person.organization;
    const orgUpdates: Record<string, any> = {};
    if (org.estimated_num_employees) orgUpdates.estimated_employees = org.estimated_num_employees;
    if (org.industry) orgUpdates.industry = org.industry;
    if (org.website_url && !companyWebsite) orgUpdates.website = org.website_url;
    if (org.linkedin_url && !companyLinkedin) orgUpdates.linkedin_url = org.linkedin_url;
    if (org.logo_url) orgUpdates.logo_url = org.logo_url;
    if (org.short_description) orgUpdates.short_description = org.short_description;
    if (org.founded_year) orgUpdates.founded_year = org.founded_year;
    if (org.annual_revenue) orgUpdates.annual_revenue = org.annual_revenue;
    orgUpdates.apollo_enriched_at = new Date().toISOString();
    if (Object.keys(orgUpdates).length > 1) {
      await supabase.from("crm_companies").update(orgUpdates).eq("id", contact.company_id);
    }
  }

  const fieldsForLog = Object.keys(updates).filter((k) => k !== "apollo_person_payload");
  await supabase.from("crm_activities").insert({
    contact_id: contact.id,
    company_id: contact.company_id,
    activity_type: "enriched",
    subject: "Apollo enrichment",
    description: `Enriched via Apollo. Updated: ${fieldsForLog.join(", ")}`,
    metadata: { source: "apollo", fields_updated: fieldsForLog },
  } as any);

  return {
    ok: true,
    updatedFields: fieldsForLog,
    fullName: updates.full_name ?? contact.full_name ?? null,
  };
}

/**
 * Enrich all primary contacts for the given company ids (one each).
 * Used by the bulk-enrich action on the prospect list.
 */
export async function bulkEnrichByCompanyIds(
  companyIds: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ success: number; failed: number }> {
  const { data: contacts } = await supabase
    .from("crm_contacts")
    .select("id,company_id,first_name,last_name,full_name,email,phone,mobile,linkedin,photo_url,city,country,job_title,seniority,department")
    .in("company_id", companyIds);

  // pick first contact per company
  const seen = new Set<string>();
  const list: EnrichableContact[] = [];
  for (const c of (contacts ?? []) as any[]) {
    if (!c.company_id || seen.has(c.company_id)) continue;
    seen.add(c.company_id);
    list.push(c as EnrichableContact);
  }

  let success = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i++) {
    try {
      const r = await enrichContact(list[i]);
      if (r.ok) success++; else failed++;
    } catch {
      failed++;
    }
    onProgress?.(i + 1, list.length);
    if (i < list.length - 1) await new Promise((r) => setTimeout(r, 1000));
  }
  return { success, failed };
}