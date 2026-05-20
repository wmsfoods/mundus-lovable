// Mundus Prospect search — placeholder edge function.
// TODO: Replace mock with Apollo API call via gateway/MCP and cache in apollo_cache (30-day TTL).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    // Expected filter shape mirrors Apollo's mixed_companies/search & mixed_people/search params:
    // entity: "companies" | "people"
    // q_organization_name, organization_locations[], organization_num_employees_ranges[],
    // q_organization_keyword_tags[], revenue_range, organization_sic_codes[], organization_naics_codes[],
    // person_titles[], person_seniorities[], person_department_or_subdepartments[],
    // contact_email_status[], person_locations[], page, per_page
    return new Response(
      JSON.stringify({
        ok: true,
        source: "mock",
        entity: body.entity ?? "companies",
        results: [],
        note: "Apollo integration pending — frontend falls back to mock data.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});