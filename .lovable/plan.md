## Goal
Replace the hardcoded `PAY_TERMS` / `PAYMENT_TERMS` arrays scattered across the app with a single source of truth in the database, and add support for "USA Domestic" terms that stay hidden until we introduce USA-Domestic deals.

## 1. Database

New table `public.payment_terms`:
- `id uuid pk`
- `label text unique` — e.g. "30% Advance, Balance TT"
- `scope text not null default 'international'` — `'international'` or `'usa_domestic'`
- `sort_order int`
- `is_active boolean default true`
- `created_at`, `updated_at`

GRANTs: `SELECT` to `anon` + `authenticated` (it's a public catalog like `cuts` / `ports`); full to `service_role`. RLS enabled; SELECT policy `true`; write restricted to `is_mundus_admin()`.

Seed rows (in this order):

**International (`scope='international'`):**
1. 100% TT
2. 100% Advance
3. 100% LC at Sight
4. 100% CAD
5. 10% Advance, Balance TT
6. 20% Advance, Balance TT
7. 25% Advance, Balance TT
8. 30% Advance, Balance TT
9. 40% Advance, Balance TT
10. 50% Advance, Balance TT
11. 60% Advance, Balance TT

**USA Domestic (`scope='usa_domestic'`):**
- 10/20/30/40/50% Advance, Balance 7 Days TIS
- 10/20/30/40/50% Advance, Balance 14 Days TIS
- 7 Net, 14 Net, 15 Net, 21 Net, 30 Net
- Due on Receipt

## 2. Frontend

New hook `src/hooks/usePaymentTerms.ts`:
```ts
usePaymentTerms({ scope?: 'international' | 'usa_domestic' | 'all' })
```
Returns `{ terms: string[], loading }`. Defaults to `'international'` (since USA Domestic deals don't exist yet). Cached at module scope.

Replace hardcoded lists in:
- `src/pages/supplier/SupplierCreateOffer.tsx` (remove `PAY_TERMS`)
- `src/pages/supplier/SupplierCreateAuction.tsx` (remove `PAY_TERMS`)
- `src/components/company/CompanyProfilePage.tsx` (remove `PAYMENT_TERMS`)
- `src/components/company/TradePreferencesSection.tsx` (remove `PAYMENT_TERMS`)

All four call sites pass `scope: 'international'` for now. When the USA Domestic flow lands, those screens can switch to `'usa_domestic'` or `'all'`.

## 3. Non-goals (explicitly out)
- No UI to manage the catalog yet (admin-managed via SQL/seed for now).
- No changes to offers/orders schema — `payment_terms` stays a free-text label so existing data keeps working.
- No "USA Domestic" toggle in Create Offer (we'll add when the broader feature lands).

## Technical notes
- Catalog table mirrors the existing `ports` / `countries` pattern.
- Hook fetches once and memoizes; falls back to a built-in list if the query fails so dropdowns never go empty.
