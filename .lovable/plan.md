## Phase 1 — Multi-office supplier DB foundation

One idempotent migration. No frontend changes. Mundus admin bypass and existing buyer access preserved.

### 1. Plants — single source of truth
Alter `public.company_plants`:
- Add `plant_number text`, `origin_port_id uuid REFERENCES public.ports(id)`, `is_active boolean NOT NULL DEFAULT true` (all `IF NOT EXISTS`).
- Indexes: `(company_id, is_active)`, `(plant_number)`.
- `COMMENT ON COLUMN public.companies.plant_numbers IS 'DEPRECATED — use company_plants'` (same on `offers.plant_numbers` if present).

### 2. offers.plant_id
- Add `plant_id uuid REFERENCES public.company_plants(id)` (nullable).
- Index `offers(plant_id)`. Keep `office_id` as-is.

### 3. office_plants (N:N) — as specified, with unique + indexes.

### 4. office_markets (N:N) — referencing `public.markets(id)` (uuid). Unique + indexes.

### 5. Global Director role
- Insert role `supplier_global_director` into `public.roles` (ON CONFLICT DO NOTHING).
- No CHECK constraints on `company_users.role` / `team_invitations.profile_type` exist that need widening (they are free-form `text`); skip CHECK edits.

### 6. Helper functions (SECURITY DEFINER STABLE, search_path=public, GRANT EXECUTE TO authenticated)
- `company_family_root(uuid) → uuid` — recursive CTE up `parent_company_id`.
- `company_family_ids(uuid) → SETOF uuid` — recursive CTE down from root.
- `is_family_global_director(uuid) → boolean` — checks `company_users` membership at family root with `roles.name = 'supplier_global_director'` OR `cu.role = 'supplier_global_director'`.
- `user_supplier_scope_ids() → SETOF uuid` — union of companies the user belongs to (via `company_users` + `user_offices`); for each, if user is family global director, expand to entire family, else just that company. Single-office suppliers (own root) resolve to their own id.

### 7. RLS — narrow supplier-side checks to family scope
For each policy below, `DROP POLICY IF EXISTS` then recreate. Mundus admin bypass and buyer/public SELECTs untouched.

- **offers**: rewrite `offers_insert_supplier`, `offers_update_supplier`, `offers_delete_supplier` to use `supplier_id IN (SELECT public.user_supplier_scope_ids()) OR is_mundus_admin()`. Keep `offers_select_all`.
- **company_plants**:
  - Replace `company_plants_member_all` with a SELECT-only policy: `company_id IN (SELECT public.user_supplier_scope_ids())`.
  - Add INSERT/UPDATE/DELETE policy: `is_mundus_admin() OR public.is_family_global_director(company_id)`.
- **office_plants / office_markets**:
  - SELECT: `office_id IN (SELECT public.user_supplier_scope_ids()) OR is_mundus_admin()`.
  - INSERT/UPDATE/DELETE: `is_mundus_admin() OR public.is_family_global_director(office_id)`.
- **negotiations**: update `public.user_can_access_negotiation(uuid)` to add family-scope check on supplier side: `o.supplier_id IN (SELECT public.user_supplier_scope_ids())`. Keep buyer membership branch and admin bypass. `neg_insert` (`user_can_create_negotiation`) unchanged.
- **orders**: rewrite `orders_select_parties_or_admin` and `orders_update_parties_or_admin` so supplier side uses `EXISTS (SELECT 1 FROM offers o WHERE o.id = orders.offer_id AND o.supplier_id IN (SELECT public.user_supplier_scope_ids()))`. Buyer branch + admin bypass unchanged.
- **offer_items, offer_markets (write_owner), offer_allowed_incoterms, offer_distributions, offer_views**: rewrite supplier-side checks from `o.supplier_id = current_user_company_id()` to `o.supplier_id IN (SELECT public.user_supplier_scope_ids())`. SELECT-all policies (offer_items, offer_markets, offer_incoterms) kept.
- **round_proposals, cut_rounds, negotiation_messages**: their existing supplier-side branches via `current_user_company_id()` on parent offer/negotiation are widened to `IN (SELECT public.user_supplier_scope_ids())`. Buyer branch untouched.

### 8. Safety
- Recursion in `company_family_root` terminates correctly for a root company (returns itself).
- Existing offers with `office_id IS NULL` / `plant_id IS NULL` stay visible — checks remain on `supplier_id`.
- All adds are `IF NOT EXISTS`; all policy drops are `IF EXISTS`; function uses `CREATE OR REPLACE`.

### Deliverable
A single migration covering sections 1–8, leaving every current supplier working unchanged and giving the platform: HQ + offices, plants owned by HQ, office→plant / office→market grants, the `supplier_global_director` role, and strict family-scoped supplier isolation with admin and buyer flows intact.
