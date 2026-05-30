## Phase 5 — Buyer multi-office model

Apply the supplier family/office pattern to buyers, **simpler** (no plants, no markets, no HQ routing inbox). Reuse the generic family helpers from Phase 1 (`company_family_root`, `company_family_ids`, `is_family_global_director`) — they're company-type-agnostic.

### 1. Database / RLS

New migration:

- **Role**: add `'buyer_global_director'` to the `roles` seed and accept it in `company_users.role` / `team_invitations.profile_type` enums/checks (mirroring `supplier_global_director`).
- **Generic scope helper**: create `public.user_buyer_scope_ids()` mirroring `user_supplier_scope_ids()` — same recursion, but filters `my_companies` to buyer companies (`is_buyer = true`) and uses `is_family_global_director` to decide self-vs-family expansion.
- **RLS updates**:
  - `buyer_requests`: SELECT/INSERT/UPDATE allowed when `buyer_company_id IN (SELECT user_buyer_scope_ids())` OR `is_mundus_admin()`. Supplier-side routing policies unchanged.
  - `negotiations`: update `user_can_access_negotiation` so the buyer branch reads `n.buyer_company_id IN (SELECT user_buyer_scope_ids())` instead of equality with `current_user_company_id()`. Supplier branch and admin branch untouched.
  - `orders`: buyer-side SELECT widened from `buyer_company_id = current_user_company_id()` to `buyer_company_id IN (SELECT user_buyer_scope_ids())`.
- **Verify** the recursion returns self for a buyer with `parent_company_id IS NULL` and no children (single-office buyers untouched).

### 2. Scope hook (generalize, don't duplicate)

- Rename `useSupplierScope` → `useCompanyScope` (keep a thin `useSupplierScope` re-export to avoid breaking imports) and add `useBuyerScope` as the buyer-side alias. Logic is identical because `useActiveOffice` + `companies.parent_company_id` already drive it.
- Extend `useActiveOffice`:
  - Treat `buyer_global_director` as master-like (same code path as `supplier_global_director`).
  - Expose `isGlobalDirector = userRole in ('supplier_global_director','buyer_global_director')` — symmetric, no separate flag needed.

### 3. Buyer hooks — apply scope

Replace `eq('buyer_company_id', company.id)` with `in('buyer_company_id', scopeIds)`, gate on `loading`, and add `scopeIds` to react-query keys, in:

- `src/hooks/useBuyerRequests.ts` (list; detail-by-id unchanged)
- `src/hooks/useBuyerNegotiations.ts`
- `src/hooks/useBuyerOrders.ts`
- `src/hooks/useBuyerDashboard.ts` (all counters)
- `src/hooks/useBuyerDemand.ts` / procurement intelligence aggregations

### 4. Buyer offices UI

- Reuse `SupplierOffices.tsx` already routed at `/buyer/offices`. Add a `mode: 'supplier' | 'buyer'` prop (or detect from current shell) to:
  - Hide the **Plants** and **Markets** tabs/sections for buyer families.
  - Force `is_buyer=true` on create/edit child offices.
  - Show per-office counters relevant to buyers: requests / negotiations / orders.
- `CreateBuyerProfileModal` role dropdown: add **Buyer Global Director**.

### 5. OfficeSwitcher + buyer consolidated dashboard

- `OfficeSwitcher` already generic — for a buyer global director it will show "All Offices · {Family}" + each office automatically once `useActiveOffice` accepts the new role.
- Buyer Home (consolidated mode): reuse supplier Phase 4 rollup components (`ByOfficeRollup` pattern) adapted to buyer entities — by-office cards for requests/negotiations/orders, office badge on recent activity rows; tapping an office focuses it.
- Operators/masters: behavior unchanged — only their office.

### 6. Buyer global director — act anywhere

- `BuyerCreateRequest`: when `isAllOffices && isBuyerGlobalDirector`, show an **Office picker** (required) and stamp `buyer_company_id` = chosen office id. In focus mode, default to the focused office.
- Negotiation actions (bid/counter/accept/chat/confirm) already use the user's identity → RLS allows family-wide buyer action automatically once §1 lands. No code change needed beyond confirming the action buttons render based on scope membership, not company-id equality.

### 7. i18n

Add keys in all 5 locales (`en/pt/es/fr/zh.json`):

- `roles.buyer_global_director`
- `buyer.multiOffice.officePickerLabel` / `placeholder` / `requiredError`
- `buyer.multiOffice.rollup.*` (titles, empty states, by-office card labels)
- `buyer.offices.*` (page title, empty state, create/edit modal labels for buyer mode)
- `shell.officeIndicator.buyerAllOffices`

### 8. Out of scope (explicit)

- No `office_plants`, no `office_markets`, no `assign_request_to_office`, no HQ inbox for buyers.
- Supplier side, admin flows, single-office buyer behavior: untouched.

### Technical notes

- `companies` table already supports `parent_company_id` + `is_buyer` — no schema changes needed beyond the role enum/check.
- Keep one generalized scope helper (`useCompanyScope`) used by both sides to avoid drift.
- All buyer queries must wait for `scope.loading === false` (same pattern proven on supplier side) to avoid empty-scope flashes.
- Verification: (a) single-office buyer sees own data only; (b) two sibling buyer offices cannot see each other's requests/negotiations/orders; (c) buyer global director sees family rollup and can create a request for any office; (d) supplier-side policies unchanged (regression-test request inbox + negotiation visibility).
