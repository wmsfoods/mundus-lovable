## Goals

1. On desktop, when the supplier opens **Create Offer** or **Create Auction**, collapse the left sidebar automatically to give the form more horizontal space.
2. Fix the auction creation layout so the **Closes at** field and the **Pricing Controls** value inputs stop overflowing the card margins.

## 1. Auto-collapse sidebar on create flows (desktop only)

**`src/layouts/SupplierShell.tsx`**
- Detect whether the current route is a "focus" route: `/supplier/offers/new` or `/supplier/auctions/create`.
- Add a small UI state `sidebarCollapsed` (default driven by route, user can override via toggle).
- Apply class `is-sidebar-collapsed` on the root `.app-shell` div when collapsed and not mobile.

**`src/components/mundus/Sidebar.tsx`**
- Accept an optional `collapsed` prop and an `onToggleCollapse` handler.
- When collapsed: hide `.sb-item-label`, `.sb-section-label`, role pill, user name/subtitle; keep icons centered.
- Add a small chevron button at the top to expand/collapse.

**`src/styles/mundus-shell.css`**
- When `.app-shell.is-sidebar-collapsed` is present (desktop only, >1100px), change `grid-template-columns` from `240px 1fr` to `64px 1fr`.
- Add `.sb.is-collapsed` rules: width 64px, center icons, hide labels, hide user meta text.

This keeps the behavior purely UI: collapse defaults to true on the two creation routes and false elsewhere; user can re-expand at any time.

## 2. Fix overflow on auction form

The `.ca-input` (datetime-local) and the pricing `<input>` inside `.cov4-ip` have no `width: 100%` / `min-width: 0`, so they grow past the card padding inside the narrow left panel.

**`src/styles/mundus-create-offer-v2.css`** — additive rules:
- `.cov4-panel, .cov4-panel-l { min-width: 0; }` so grid cells can shrink.
- `.ca-window-grid { min-width: 0; }` and `.ca-field { min-width: 0; }`.
- `.ca-input { width: 100%; min-width: 0; box-sizing: border-box; }` so both date inputs fit the column.
- `.ca-price-row { min-width: 0; }` and ensure the `.cov4-ip` group + its inner `<input>` use `width: 100%` / `flex: 1 1 auto` and `min-width: 0` so the price field stays inside the card.
- Keep existing responsive rules (single column at ≤640px) intact.

No business logic, data model, or component structure changes outside the small sidebar collapse toggle.

## Out of scope

- Buyer/admin shells (request was supplier-only).
- Mobile layout (sidebar already becomes a drawer on mobile).
- Database, offer numbering, or any non-visual change.
