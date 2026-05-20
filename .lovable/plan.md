
## Goal
Transform Find Prospect (Companies & People) from local mock filtering into a real Apollo-powered search, matching Apollo's UX: results refresh as filters are toggled, and pressing Enter in the search bar runs a name search. Trim mock data so it does not pollute the new flow.

## 1. Apollo wiring (edge function)

Replace the current placeholder in `supabase/functions/prospect-search/index.ts` with a real call to Apollo:

- Read `APOLLO_API_KEY` from `Deno.env` (the existing `apollo` secret will be renamed/copied to `APOLLO_API_KEY` — secret already exists in the project as `apollo`, we'll use that key directly).
- Validate body with Zod: `entity: "companies" | "people"`, plus Apollo's documented params (`q_organization_name`, `organization_locations[]`, `organization_num_employees_ranges[]`, `q_organization_keyword_tags[]`, `revenue_range{min,max}`, `organization_industry_tag_ids[]`, `organization_sic_codes[]`, `organization_naics_codes[]`, `person_titles[]`, `person_seniorities[]`, `person_department_or_subdepartments[]`, `contact_email_status[]`, `person_locations[]`, `page`, `per_page`).
- POST to `https://api.apollo.io/api/v1/mixed_companies/search` or `mixed_people/search` with header `X-Api-Key`.
- Return `{ ok, entity, results, pagination: { page, per_page, total_entries, total_pages }, source: "apollo" }`.
- CORS + 400 on validation error + 502 on Apollo error.
- Optional (skipped this round): cache layer in `apollo_cache` — defer to a follow-up.

## 2. Frontend hook — `useProspectSearch`

New `src/hooks/useProspectSearch.ts`:

- Accepts a `params` object (companies or people shape).
- Debounces param changes (250ms) and calls `supabase.functions.invoke("prospect-search", { body: params })`.
- Exposes `{ data, loading, error, page, setPage, total, refetch }`.
- Handles abort/race so the latest request wins.
- Maps Apollo's response into the existing `MockCompany` / `MockPerson` shapes used by the table so the rest of the page is untouched.

## 3. Find Companies page

`src/pages/admin/prospect/FindCompanies.tsx`:

- Replace `MOCK_COMPANIES`-based `filtered` with `useProspectSearch({ entity: "companies", ... })`.
- Search input: type freely (no auto-fire); fire on **Enter** OR via a visible "Search" button next to the input (icon + label). The current code has no button — add a styled `psp-btn solid` "Search".
- Filters: every chip/checkbox/range/text change triggers the debounced search automatically (Apollo-style live refinement). Keyword and city free-text inputs commit on blur or Enter.
- Loading state: skeleton rows in the table; "Searching Apollo…" indicator in the toolbar.
- Empty state: "No companies match these filters. Try widening location, revenue, or employees."
- Credits chip stays static for now.
- Pagination uses Apollo's `total_entries` / `total_pages`.

## 4. Find People page

Same treatment in `src/pages/admin/prospect/FindPeople.tsx`:

- `useProspectSearch({ entity: "people", ... })`.
- Enter or "Search" button for the top text search.
- Filters trigger live re-query.
- Reveal email/phone buttons remain mock for now (real reveal needs a separate Apollo `people/match` call — out of scope this round).

## 5. Trim mock data

`src/data/mockProspect.ts`:

- Reduce `MOCK_COMPANIES` to **1** entry (keep `JBS S.A.` as canonical example).
- Reduce `MOCK_PEOPLE` to **1** entry (keep `Carlos Mendes` at JBS).
- Keep all preset constants (`COUNTRIES`, `INDUSTRIES`, `KEYWORDS`, etc.) — those drive the filter UI.

`src/hooks/useAdminProspects.ts`:

- Reduce `SEEDS` to **1 supplier + 1 buyer** (JBS Brasil and Tokyo Premium Imports) so the Prospects list/Pipeline still demonstrates both lead types without being noisy.

## 6. Out of scope (for follow-ups)

- Apollo cache table (`apollo_cache`) with 30-day TTL.
- Real email/phone reveal via Apollo enrichment endpoints (credit charge).
- "Save search" persistence (currently just a toast).
- Industry tag-id resolution (Apollo expects IDs, not labels) — first cut sends `q_organization_keyword_tags` from our `INDUSTRIES` array as keywords; we'll add a tag-id mapping table in a follow-up.

## Technical notes

- Files touched: `supabase/functions/prospect-search/index.ts`, `src/hooks/useProspectSearch.ts` (new), `src/pages/admin/prospect/FindCompanies.tsx`, `src/pages/admin/prospect/FindPeople.tsx`, `src/data/mockProspect.ts`, `src/hooks/useAdminProspects.ts`, `src/styles/mundus-prospect.css` (add `.psp-search-btn` and loading skeleton styles).
- Secret: `apollo` is already configured — the edge function will read it as `Deno.env.get("apollo")`. No new secret needed.
- Existing `verify_jwt = false` is fine for an admin-only page protected at the React Router layer; we'll add a `is_mundus_admin()` server check inside the function using the caller's JWT before charging Apollo credits.
- No DB migration required.

After implementation we'll verify by opening `/admin/prospect/companies`, typing "jbs" + Enter, and toggling a country chip to confirm a fresh Apollo call fires and results render.
