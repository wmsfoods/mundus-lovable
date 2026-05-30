# Phase 3.5 + Phase 4 — Multi-office supplier model

Two related phases shipped together: routing inbound requests through HQ to a single office, and giving the Global Director a consolidated family experience plus an anonymized cross-supplier benchmark.

---

## Phase 3.5 — Request routing (HQ → office)

### 1. Database migration

Add to `buyer_requests`:
- `assigned_office_id uuid` (FK `companies.id`, nullable)
- `assigned_by_user_id uuid` (FK `users.id`, nullable)
- `assigned_at timestamptz`
- `routing_status text NOT NULL DEFAULT 'unassigned'` CHECK in (`unassigned`,`assigned`)
- Indexes on `assigned_office_id` and `routing_status`

Helper + RPCs (all SECURITY DEFINER, `search_path=public`):
- `is_family_hq(company)` → bool (any child exists)
- `assign_request_to_office(p_request_id, p_office_id, p_user_id)` enforcing:
  - office must be in the family of `target_supplier_id` (or its own family if target null)
  - caller must be mundus admin OR family global director OR HQ-root member (NOT an office-locked operator — checked by verifying `cu.company_id = company_family_root(office)`)
  - sets routing fields and `routing_status='assigned'`
- `GRANT EXECUTE ... TO authenticated`

RLS tightening on `buyer_requests`: within a family-HQ supplier, an office-locked operator sees a request only when `assigned_office_id` ∈ their office scope. HQ-pool viewers (admin/director/HQ-root member) always see family requests. Single-office suppliers keep current behavior. Implemented via a helper predicate referencing `company_family_root` / `is_family_hq` to avoid recursion.

Backfill: existing rows for family suppliers → `routing_status='unassigned'`; existing rows for single-office targets remain visible as today (policy ignores `routing_status` when target is not a family HQ).

### 2. Auto-route stub (defined, NOT wired)

- Add `companies.auto_route_requests boolean DEFAULT false` (lightest option — column on HQ company).
- Define `auto_route_request(p_request_id)` that, given the request's destination country, looks up the family office whose `office_markets` covers it; if exactly one match, calls `assign_request_to_office`; otherwise no-op. Header comment: "enable in a later phase; HQ assigns manually for now." No trigger, no caller.

### 3. Notification triggers (best-effort)

- AFTER INSERT on `buyer_requests` where target supplier is a family HQ → notify HQ pool ("New request for {Family} — assign to an office").
- AFTER UPDATE of `assigned_office_id` (null → not null) → notify that office's members ("New request assigned to {Office}").
- Reuse `_notify_company` pattern; email via existing `enqueue_email` infra. Wrapped in `BEGIN ... EXCEPTION WHEN OTHERS THEN ...` so notification failure never blocks the write.

### 4. Frontend — Supplier Requests page

Refactor `src/pages/supplier/Requests.tsx` + `src/hooks/useBuyerRequests.ts` to use Phase 2 scope + the new routing fields, with three modes derived from `useActiveOffice()`:

- **HQ inbox** (admin / global director / HQ-root member of a family): two tabs `Unassigned` / `Assigned`. Unassigned rows show an `Assign to office ▾` dropdown listing the family's offices (loaded via `company_family_ids` on the HQ); selecting one calls `assign_request_to_office` and optimistically moves the row to Assigned. Assigned tab shows office badge + who/when.
- **Office operator**: single list filtered to `assigned_office_id = active office id`. No assign UI.
- **Single-office supplier**: unchanged.

Create-offer path from an assigned request passes the assigned office as acting office (Phase 3 wizard reads it).

### 5. Dashboard fix

In `src/hooks/useSupplierDashboard.ts` replace the marketplace-wide `incomingRequests` query (line 110, TODO at 113) with scope-aware counting:
- HQ/All Offices: family unassigned + assigned-but-unanswered.
- Office focus / operator: `assigned_office_id = activeOfficeId` and no response yet.
- Single-office: today's logic.

### 6. i18n

Add keys under `requests.routing.*` to all 5 locales: `hqInbox`, `unassigned`, `assigned`, `assignToOffice`, `assignedTo`, `assignedBy`, `assignedAt`, `routingPending`, `noOfficeAssigned`, assignment error toasts, notification titles/bodies.

---

## Phase 4 — Global Director experience

### 1. Consolidated supplier dashboard ("All Offices" mode)

Extend `src/pages/supplier/SupplierHome.tsx` + `useSupplierDashboard`:
- When `useActiveOffice().isGlobalDirector && !focusedOfficeId`, fetch with `scopeIds = company_family_ids(root)`.
- Aggregated KPIs across the family + new **By-office breakdown** (small cards/bars): per office show active offers, open negotiations, closed deals (count & value), incoming/assigned requests.
- Tapping an office card calls the OfficeSwitcher to focus that office (deep-link).
- Recent activity list (offers / negotiations / deals) decorated with an office badge.
- Reuse existing dashboard query shapes; grouping done by `office_id` (or `supplier_id` fallback).

### 2. Act-anywhere verification

- Smoke-check that opening any offer / negotiation / sale across offices from the consolidated lists doesn't throw on RLS (family scope already permits action).
- Net-new "Create Offer" in consolidated mode keeps the Phase 3 §6 office picker.
- Confirm no UI gate blocks director actions because of office focus (focus is a view filter, not a permission gate).

### 3. Cut Comparison page

New route `/supplier/insights/cut-comparison`, gated to `supplier_global_director` + mundus admin. Sidebar entry added only for those roles.

Filters: cut (standard_product) [required], destination market, FCL size, incoterm, time window (default last 180 days).

Two data sources:
- **Own family**: rows by origin country (from each plant), columns avg asking USD/kg, recent closed USD/kg, FCL value, sample count. Sourced from `offers`/`offer_items`/closed `orders` where supplier ∈ `user_supplier_scope_ids()`.
- **Anonymized market**: single row from the new RPC.

New RPC `market_cut_benchmark(p_standard_product_id, p_destination_country, p_since)` → `(sample_count, min, median, max)` aggregating ALL suppliers' `offer_items` for that standard product. SECURITY DEFINER, returns aggregates only, never identifying columns. Min-sample guard: if `sample_count < 3`, the function returns the count but NULLs for min/median/max; UI shows "Insufficient market data". `GRANT EXECUTE TO authenticated`.

UI: comparison table (horizontal scroll on mobile) + simple price-by-origin vs market-band chart using existing Recharts components.

### 4. Director-only navigation

In `src/components/supplier/SupplierShell.tsx` (or wherever the sidebar lives), conditionally render "Consolidated" home variant and "Cut Comparison" entry only when `isGlobalDirector || isMundusAdmin`.

### 5. i18n

Add keys under `supplier.consolidated.*` and `supplier.cutComparison.*` to all 5 locales.

---

## Security guarantees

- Office operators never see unassigned family requests (enforced in RLS + server-side RPC; UI also hides controls).
- `assign_request_to_office` validates caller role server-side; cannot be bypassed by client.
- Global Director scope is always limited to their own family via `user_supplier_scope_ids()`.
- `market_cut_benchmark` is the ONLY cross-supplier read; returns aggregates only and suppresses values when `sample_count < 3` to prevent single-competitor reverse-engineering.

## Non-goals / out of scope

- Auto-routing remains OFF (stub only).
- No changes to buyer side beyond the request still being created the same way.
- No changes to single-office suppliers' UX.
- No changes to existing negotiation/order flows.

## Files touched (high level)

Migrations: 1 new (routing fields, helpers, RPCs, RLS update, notification triggers, auto-route stub, `auto_route_requests` column, `market_cut_benchmark`).

Frontend:
- `src/pages/supplier/Requests.tsx`, `src/hooks/useBuyerRequests.ts`
- `src/hooks/useSupplierDashboard.ts`, `src/pages/supplier/SupplierHome.tsx`
- New `src/pages/supplier/insights/CutComparison.tsx` + route
- Supplier sidebar/shell for director-only nav
- New `src/components/supplier/AssignOfficeMenu.tsx`, `src/components/supplier/ByOfficeBreakdown.tsx`
- i18n files (5 locales)
