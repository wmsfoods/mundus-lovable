// Mundus Prospect search — Apollo.io proxy.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APOLLO_BASE = "https://api.apollo.io/api/v1";

type Body = Record<string, unknown> & { entity?: "companies" | "people" };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("apollo") ?? Deno.env.get("APOLLO_API_KEY");
  if (!apiKey) {
    return jsonResponse({ ok: false, error: "apollo_api_key_missing", fallback: true });
  }

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const entity = body.entity === "people" ? "people" : "companies";
  // For people, try the prospect DB (mixed_people/search) first, and fall back
  // to CRM contacts/search if the plan can't access it.
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
        // Apollo mixed_people/search whitelist
        "q_keywords",
        "person_titles",
        "person_not_titles",
        "person_seniorities",
        "person_departments",
        "person_locations",
        "person_not_locations",
        "organization_locations",
        "organization_ids",
        "organization_num_employees_ranges",
        "q_organization_name",
        "q_organization_domains_list",
        "contact_email_status",
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
      const code = json?.error_code ?? json?.apollo?.error_code ?? null;
      // Return 200 with ok:false so the client always gets a parsed body
      // (supabase.functions.invoke swallows the body on non-2xx).
      // The UI can branch on `error_code` (e.g. API_INACCESSIBLE → upgrade Apollo plan).
      return jsonResponse(
        {
          ok: false,
          status: r.status,
          error_code: code,
          fallback: true,
          error: json?.error ?? json?.message ?? "apollo_error",
          apollo: json,
        },
      );
    }

    const results = entity === "companies"
      ? (json.organizations ?? json.accounts ?? [])
      : (json.contacts ?? json.people ?? []);
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
    return jsonResponse({ ok: false, error: msg, fallback: true });
  }
});