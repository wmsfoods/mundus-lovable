## Goal
Make the buyer dashboard's **Recent offers** and **Recent orders** sections display real data from the backend instead of showing the static empty placeholders.

## Current state
`src/pages/buyer/Home.tsx` currently hardcodes two `<div className="card-row-empty">` blocks with the empty-state translation strings. No data is being fetched for these sections. Meanwhile:
- Real offers are already available via `useOffers()` (returns `OfferWithDetails[]` from the `offers` table, newest first).
- The `orders` table exists in the backend with the columns we need (`order_number`, `status`, `placed_at`, `offer_id`, `fcl_count`, `incoterm`, …) but currently has 0 rows. `useBuyerOrders` still returns mock data.

## Changes

### 1. Recent offers (real data)
- In `BuyerHome`, call `useOffers()` and take the first 4 results (already sorted by `created_at desc`, with `deleted_at` filtered out).
- Render them as compact cards (same visual language as the buyer Offers page: protein chip, supplier name, origin + flag, shipment month, FCL/total, status pill, "View" link to `/buyer/offers/:id`).
- While loading, show 4 skeleton cards. If the query returns zero rows, keep the existing "Recent offers will appear here…" empty state.

### 2. Recent orders (real data)
- Replace the mock in `src/hooks/useBuyerOrders.ts` with a real Supabase fetch from `orders` joined with the related `offers` row (for supplier name + product summary) and `destination_port` (for destination). Sort by `placed_at desc nulls last, created_at desc`, exclude `deleted_at`, limit to the most recent.
- Keep the existing `BuyerOrder` shape so the Orders page that already consumes this hook keeps working; map DB columns into that shape. Fields without a backing column today (e.g., `oceanFreightUsd`, `pricePerKg`, `quantityKg`) fall back to derived values from the offer/items or to `0` when unknown.
- In `BuyerHome`, render the top 4 orders as compact cards (order number, status pill, supplier, destination, shipment month, FCL count, link to `/buyer/orders/:id`). Empty/loading states mirror the offers section above.

### 3. Styling
Reuse the existing dashboard tokens. Add a small `card-row` grid (4 cols desktop, 2 cols tablet, 1 col mobile, respecting the mobile-first memory) next to the existing `card-row-empty` rule in the buyer dashboard CSS, plus a lightweight `mini-card` style for the row items. No new design system tokens.

### 4. Files touched
- `src/pages/buyer/Home.tsx` — wire up data, render real recent offers + orders, keep empty/loading states.
- `src/hooks/useBuyerOrders.ts` — swap mock for Supabase query (preserves current return type so `pages/buyer/Orders.tsx` keeps working).
- `src/pages/buyer/Home.css` (or wherever the buyer dashboard styles live — confirm in implementation) — add `card-row` + `mini-card` styles.

## Out of scope
- No schema changes; `orders` table already exists.
- No changes to the supplier dashboard.
- No changes to the existing Offers/Orders list pages beyond what's required to keep `useBuyerOrders` compatible.
