// Mundus Prospect search — Apollo.io proxy.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APOLLO_BASE = "https://api.apollo.io/api/v1";

type Body = Record<string, unknown> & { entity?: "companies" | "people" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("apollo") ?? Deno.env.get("APOLLO_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "apollo_api_key_missing" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const entity = body.entity === "people" ? "people" : "companies";
  const path = entity === "people" ? "mixed_people/search" : "mixed_companies/search";

  // Whitelist of Apollo params we forward. Empty arrays / null / "" are stripped.
  const allow = entity === "companies"
    ? [
        "q_organization_name", "organization_locations", "organization_not_locations",
        "organization_num_employees_ranges", "q_organization_keyword_tags",
        "revenue_range", "organization_industry_tag_ids",
        "organization_sic_codes", "organization_naics_codes",
        "page", "per_page",
      ]
    : [
        "q_keywords", "person_titles", "person_seniorities",
        "person_department_or_subdepartments", "contact_email_status",
        "person_locations", "organization_locations",
        "organization_num_employees_ranges", "q_organization_name",
        "page", "per_page",
      ];

  const payload: Record<string, unknown> = {};
  for (const k of allow) {
    const v = (body as Record<string, unknown>)[k];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    payload[k] = v;
  }
  if (!payload.page) payload.page = 1;
  if (!payload.per_page) payload.per_page = 25;

  try {
    const r = await fetch(`${APOLLO_BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      return new Response(
        JSON.stringify({ ok: false, status: r.status, error: json?.error ?? json?.message ?? "apollo_error", apollo: json }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    const results = entity === "companies"
      ? (json.organizations ?? json.accounts ?? [])
      : (json.people ?? json.contacts ?? []);
    const pagination = json.pagination ?? {
      page: payload.page, per_page: payload.per_page,
      total_entries: results.length, total_pages: 1,
    };

    return new Response(
      JSON.stringify({ ok: true, source: "apollo", entity, results, pagination }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});