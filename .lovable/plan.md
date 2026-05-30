## Phase 2 — Front-end office scoping (supplier side)

Scope is **front-end + hooks only**. No DB changes. No changes to buyer/admin flows or to the create-offer write path (TODO note only). RLS keeps the hard guarantee; this phase makes the UI compute the correct office focus.

---

### 1. `src/hooks/useActiveOffice.ts` — Global Director awareness

- Extend `isMaster` to also include `supplier_global_director`.
- Add `isGlobalDirector = userRole === "supplier_global_director"` and return it.
- For a Global Director, `visibleOffices` = entire family (HQ + all child offices), not only `user_offices` assignments. Reuse `useCompanyOffices` — it already returns HQ + `parent_company_id = currentCompanyId`, which matches the current one-level office tree. Add a small note that if offices later have children, swap to a recursive query / DB helper (`company_family_ids`).
- Keep everything else identical: localStorage persistence, auto-lock single office, stale-office clearing, "All Offices (Consolidated)" option for masters/directors.
- Return shape adds: `isGlobalDirector: boolean`.

### 2. New `src/hooks/useSupplierScope.ts` — single source of truth

Thin wrapper around `useActiveOffice` + `useCurrentCompany`:

```text
{ scopeIds, activeOfficeId, isAllOffices, isGlobalDirector, loading }
```

Logic:
- `loading` true while `useActiveOffice.loading` or company loading → callers must wait.
- A specific office is active → `scopeIds = [activeOfficeId]` (focus mode, applies even to Global Director).
- "All Offices" consolidated → `scopeIds = visibleOffices.map(o => o.id)`.
- Single-office operator (auto-locked) → `scopeIds = [their office id]`.
- Fallback (no offices resolvable yet but company known) → `scopeIds = [company.id]` to avoid querying empty arrays.

All four hooks below consume this and nothing else for scope.

### 3. `src/hooks/useRealSupplierOffers.ts`

- Remove the "intentionally not applied" comment + behaviour.
- Use `useSupplierScope`; gate the query on `!scope.loading && scopeIds.length > 0` (mirror existing `companyLoading` guard).
- Replace `.eq("supplier_id", supplierId)` → `.in("supplier_id", scopeIds)`.
- Include `scopeIds.join(",")` (or activeOfficeId + isAllOffices) in the realtime channel key / refetch deps so switching office refetches.
- Mapping, realtime, sort: unchanged.

### 4. `src/hooks/useRealNegotiationsList.ts` (supplier branch only)

- For `role === "supplier"`:
  - Replace `q.eq("offer.supplier_id", company.id)` with `q.in("offer.supplier_id", scopeIds)`.
  - Keep the existing `office_id = activeOfficeId OR office_id IS NULL` tolerance only when a single office is focused, so legacy rows with null `office_id` still appear. When `isAllOffices`, drop the office_id filter entirely.
- Buyer branch unchanged.
- Add scope to react-query key.

### 5. `src/hooks/useSupplierSales.ts`

- Use `useSupplierScope`.
- Replace `.eq("supplier_id", company.id)` in the offer-ids lookup with `.in("supplier_id", scopeIds)`.
- Gate on scope loading; include scope in query key.

### 6. `src/hooks/useSupplierDashboard.ts`

- Use `useSupplierScope`.
- All `.eq("supplier_id", companyId)` (activeOffers, totalOffers, offerIds source) → `.in("supplier_id", scopeIds)`.
- Negotiation counts derive from `offerIds` → automatically scoped, leave the derivation.
- `incomingRequests` stays marketplace-wide; add: `// TODO phase 3/5: scope incoming requests by office markets`.
- Include `scopeIds` in every affected `queryKey` so switching office refetches.

### 7. `src/components/mundus/OfficeSwitcher.tsx` — polish

- Keep "hide when only one office" behaviour.
- When `isGlobalDirector`, label the consolidated row "All Offices · {Family Name}" and show a small "Director" badge/chip next to the trigger.
- Verify mobile usability: 44px tap targets, dropdown not clipped inside Topbar. If the Topbar currently hides controls on mobile, surface the switcher in the mobile drawer/header so office context is always reachable. (Touches only Topbar/mobile drawer presentation; no logic changes.)

### 8. Empty / focus states

When a single office is focused and a list is empty, show a friendly message that names the office, e.g.:
- Offers: "No offers yet for {Office Name}"
- Sales: "No sales yet for {Office Name}"
- Negotiations: "No negotiations yet for {Office Name}"
- Dashboard cards: subtle "Showing {Office Name}" hint above the KPI grid when not in "All Offices".

Generic empty states remain for "All Offices" / single-office operators.

### 9. i18n (en/pt/es/fr/zh)

New keys under existing `supplier` / `shell` namespaces:
- `officeSwitcher.allOfficesFamily` ("All Offices · {{family}}")
- `officeSwitcher.directorBadge` ("Director")
- `emptyStates.noOffersForOffice`, `noSalesForOffice`, `noNegotiationsForOffice`
- `dashboard.showingOffice` ("Showing {{office}}")

Add to all 5 locale files.

### 10. Guardrails / non-goals

- No DB, RLS, migrations, edge-function changes.
- Buyer + admin code paths untouched.
- Create-offer wizard: if it doesn't persist `office_id` from active office today, add `// TODO phase 3: persist office_id from useActiveOffice on offer insert` near the insert call — do not change behaviour.
- Never query without `scopeIds`; never bypass the helper. RLS will still block cross-family leakage, but the UI must never widen scope by accident.

### Technical details

- Files changed: `useActiveOffice.ts`, `useRealSupplierOffers.ts`, `useRealNegotiationsList.ts`, `useSupplierSales.ts`, `useSupplierDashboard.ts`, `OfficeSwitcher.tsx`, supplier list/dashboard pages (empty-state strings only), 5 locale files.
- Files added: `src/hooks/useSupplierScope.ts`.
- React Query keys must include `scopeIds` (stable join) so office switches trigger refetch instead of stale cache hits.
- All scope-consuming hooks short-circuit while `scope.loading` to avoid the "query with wrong scope then flip" race.

### Open questions / red flags

1. `useCompanyOffices` currently expands one level (`id = X OR parent_company_id = X`). For Phase 2 this matches reality, but if a Global Director's family ever has nested offices, the visible set will be incomplete. Plan keeps the one-level query and leaves a TODO to switch to the DB helper `company_family_ids` if/when needed. **Confirm one-level is acceptable for Phase 2.**
2. The "All Offices · {Family Name}" label needs a family display name. Easiest source is the HQ company's `name`. **OK to use HQ name as family name?**
3. Legacy negotiations with `office_id IS NULL`: kept visible when a single office is focused (current behaviour). Confirm we keep that tolerance rather than hiding legacy rows.
