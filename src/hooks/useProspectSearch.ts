import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MockCompany, MockPerson } from "@/data/mockProspect";

export type SearchEntity = "companies" | "people";

export interface ApolloPagination {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

export interface ProspectSearchState<T> {
  rows: T[];
  pagination: ApolloPagination;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  source: "apollo" | null;
  hasSearched: boolean;
}

function flagFor(country?: string): string {
  if (!country) return "🌐";
  const map: Record<string, string> = {
    "United States": "🇺🇸", "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Uruguay": "🇺🇾",
    "China": "🇨🇳", "Japan": "🇯🇵", "Philippines": "🇵🇭", "Hong Kong": "🇭🇰",
    "United Arab Emirates": "🇦🇪", "Saudi Arabia": "🇸🇦", "Egypt": "🇪🇬",
    "Denmark": "🇩🇰", "Netherlands": "🇳🇱", "France": "🇫🇷", "Canada": "🇨🇦",
    "Mexico": "🇲🇽", "Turkey": "🇹🇷", "Vietnam": "🇻🇳", "Malaysia": "🇲🇾",
    "Thailand": "🇹🇭", "Morocco": "🇲🇦", "Peru": "🇵🇪", "Colombia": "🇨🇴",
    "South Africa": "🇿🇦",
  };
  return map[country] ?? "🌐";
}

function bucketRange(n?: number | null): string {
  if (!n || n <= 0) return "1-10";
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  if (n <= 1000) return "501-1000";
  if (n <= 5000) return "1001-5000";
  if (n <= 10000) return "5001-10000";
  return "10001+";
}

export function mapCompany(o: any): MockCompany {
  const country = o.country ?? o.organization_country ?? o.primary_country ?? "";
  return {
    id: o.id ?? o._id ?? o.organization_id ?? String(o.uuid ?? Math.random()),
    name: o.name ?? o.organization_name ?? "—",
    domain: o.primary_domain ?? o.website_url?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? o.domain ?? "",
    industry: o.industry ?? (o.industries && o.industries[0]) ?? "—",
    country: country || "—",
    countryFlag: flagFor(country),
    city: o.city ?? "—",
    employees: o.estimated_num_employees ?? o.num_employees ?? 0,
    employeeRange: bucketRange(o.estimated_num_employees ?? o.num_employees),
    revenue: o.annual_revenue ?? o.organization_revenue ?? 0,
    founded: o.founded_year ?? 0,
    description: o.short_description ?? o.seo_description ?? "",
    website: o.website_url ?? (o.primary_domain ? `https://${o.primary_domain}` : ""),
    linkedin: o.linkedin_url ?? "",
    logo_url: o.logo_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(o.name ?? "X")}&backgroundColor=B64769`,
    stage: null,
    in_crm: false,
    keywords: o.keywords ?? [],
  };
}

export function mapPerson(p: any): MockPerson {
  const org = p.organization ?? {};
  const country = p.country ?? org.country ?? "";
  const first = p.first_name ?? "";
  const last = p.last_name ?? p.last_name_obfuscated ?? "";
  const hasEmail = p.has_email === true || !!p.email;
  const emailStatus: MockPerson["emailStatus"] = (p.email_status as MockPerson["emailStatus"])
    ?? (p.email ? "verified" : hasEmail ? "unverified" : "unavailable");
  const hasPhone = !!(p.sanitized_phone || p.phone_numbers?.length || p.has_direct_phone === "Yes" || p.has_direct_phone === true);
  return {
    id: p.id ?? p._id ?? String(Math.random()),
    firstName: first,
    lastName: last,
    fullName: p.name ?? `${first} ${last}`.trim(),
    jobTitle: p.title ?? "—",
    companyId: org.id ?? "",
    companyName: org.name ?? p.organization_name ?? "—",
    companyLogo: org.logo_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(org.name ?? "X")}&backgroundColor=791f3f`,
    photoUrl: p.photo_url ?? null,
    email: p.email ?? null,
    emailStatus,
    emailRevealed: !!p.email,
    phone: null,
    phoneAvailable: hasPhone,
    phoneRevealed: false,
    mobile: null,
    mobileAvailable: false,
    mobileRevealed: false,
    country: country || "—",
    countryFlag: flagFor(country),
    city: p.city ?? "—",
    seniority: (p.seniority as MockPerson["seniority"]) ?? "Staff",
    department: (p.departments && p.departments[0]) ?? "—",
    linkedin: p.linkedin_url ?? "",
    whatsapp: null,
    in_crm: false,
  };
}

export function useProspectSearch<T = MockCompany | MockPerson>(
  entity: SearchEntity,
  params: Record<string, unknown>,
  options: { enabled?: boolean; debounceMs?: number } = {},
) {
  const { enabled = true, debounceMs = 250 } = options;
  const [state, setState] = useState<ProspectSearchState<T>>({
    rows: [],
    pagination: { page: 1, per_page: 25, total_entries: 0, total_pages: 0 },
    loading: false,
    error: null,
    errorCode: null,
    source: null,
    hasSearched: false,
  });
  const reqId = useRef(0);
  const key = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    if (!enabled) return;
    const myId = ++reqId.current;
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { data, error } = await supabase.functions.invoke("prospect-search", {
        body: { entity, ...params },
      });
      if (myId !== reqId.current) return;
      const rawMessage = error?.message ?? data?.error ?? "search_failed";
      const inaccessible = rawMessage.includes("mixed_people/search is not accessible") || rawMessage.includes("API_INACCESSIBLE");
      if (error || !data?.ok) {
        setState((s) => ({
          ...s,
          rows: [],
          pagination: { page: Number(params.page ?? 1), per_page: Number(params.per_page ?? 25), total_entries: 0, total_pages: 0 },
          loading: false,
          error: rawMessage,
          errorCode: data?.error_code ?? (inaccessible ? "API_INACCESSIBLE" : null),
          hasSearched: true,
        }));
        return;
      }
      const rows = (data.results ?? []).map((r: any) =>
        entity === "companies" ? mapCompany(r) : mapPerson(r),
      ) as T[];
      setState({
        rows,
        pagination: data.pagination,
        loading: false,
        error: null,
        errorCode: null,
        source: data.source ?? "apollo",
        hasSearched: true,
      });
    }, debounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, entity, enabled, debounceMs]);

  return state;
}