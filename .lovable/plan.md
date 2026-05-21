## Goal

Add a consistent, modern filter to two pages, so users can quickly narrow down deals:

- **Supplier → Sales** (`/supplier/sales`): filter by destination port, origin port, buyer, date, deal ID, product, status.
- **Buyer → Orders** (`/buyer/orders`): same pattern — destination, origin, supplier, date, deal ID, product, status.

The two pages will share the same filter component and UX so the experience feels unified across the platform.

## UX

A single filter bar above the results table/cards, with three layers:

1. **Quick search box** — typing matches any field at once (deal ID, product, buyer/supplier, ports). Useful for the most common case ("just find it").
2. **Quick status chips** — one chip per status (All, Awaiting acceptance, Awaiting pre-payment, In production, Shipped, Delivered, Completed, Rejected). Tap to filter; count badge per chip.
3. **Advanced filters** (collapsible panel, opens via a "Filters" button with an active-count badge):
   - Deal ID (text)
   - Product (multi-select from the products present in the data)
   - Buyer / Supplier (multi-select from existing names)
   - Origin port / Origin country (multi-select)
   - Destination port / Destination country (multi-select)
   - Date range (from / to, using the shadcn date picker)
   - Active-filter chips row showing each applied filter with an "✕" to remove it individually, plus a "Clear all" link.

Result count + sort dropdown stay where they are today; only the filter row is new.

## Mobile

- Quick search and status chips stay visible; chips scroll horizontally.
- "Filters" button opens a bottom-sheet (`MobileDrawer`) with the advanced filters stacked vertically — single-column, large touch targets, sticky "Apply / Clear" footer with safe-area padding.
- Active-filter chips wrap below the toolbar so the user always sees what's applied.

## Files

**New**
- `src/components/marketplace/DealsFilterBar.tsx` — shared filter component. Props: items, fields config (which filter fields to show + labels), labels for buyer-vs-supplier wording, current filter state, `onChange`. Renders the search box, status chips, "Filters" button, advanced panel/sheet, and active-filter chips.
- `src/hooks/useDealsFilter.ts` — small helper that takes raw items + filter state and returns the filtered list plus per-status counts and the unique option lists for each dropdown (built from the data itself, so options stay in sync).

**Edited**
- `src/pages/supplier/Sales.tsx` — wire `DealsFilterBar` with field set: `dealId, product, buyer, originPort, destinationPort, status, dateRange`. Replace the local sort/filter logic with the hook's filtered list.
- `src/pages/buyer/Orders.tsx` — wire `DealsFilterBar` with field set: `dealId (orderNumber), product, supplier, origin, destination, status, dateRange`. Buyer orders today only have `origin`/`destination` as countries (no port field) — we'll filter on country there and keep the "port" label only for supplier. Same component, different field config.
- `src/i18n/locales/en.json` / `pt.json` / `es.json` — add a shared `filters.*` block (searchPlaceholder, filters, clearAll, apply, dateFrom, dateTo, originPort, destinationPort, buyer, supplier, product, dealId, status, noResults) plus a few page-specific strings.
- `src/index.css` (or a new `src/styles/mundus-deals-filter.css`) — styles for the bar, chips, popovers, and the active-filter row.

## Technical Notes

- Reuse existing primitives: shadcn `Popover` + `Command` for multi-select dropdowns (already used in Create Offer), shadcn `Calendar` inside a `Popover` for the date range, `MobileDrawer` for the mobile filter sheet, `useIsMobile` to switch between desktop popover and mobile sheet.
- Filtering happens fully in memory on the mock data — no backend changes. The hook recomputes via `useMemo` against the items array.
- Status chip counts always reflect the data with the *other* filters applied, so the user can see how each option would narrow the list (a common UX nicety in modern filter bars).
- URL sync is out of scope for this pass; filter state stays local. Easy to add later if needed.
- Date range matches against `orderDate` parsed as a local date.

## Out of scope

- Saved filter presets / sharing filters via URL — can be added later.
- Server-side filtering — current pages use mock data; this PR keeps it client-side.
- Touching auctions, requests, negotiations — only Sales and Orders for now.

