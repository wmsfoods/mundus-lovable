## Goal

Make the per-product price history match the attached reference ("Price details — full history") and stop being squeezed into the narrow right column. It needs room to breathe horizontally because every negotiation can reach 4 rounds (Bid + Counter each).

## Where it appears today

- `src/pages/buyer/BuyerNegotiationDetail.tsx` — inside the right column, below `DealProgressionCard`.
- `src/pages/supplier/SupplierNegotiationDetail.tsx` — inside the right column, below `DealProgressionCard`.
- Admin (`/admin/negotiations/:id`) reuses `SupplierNegotiationDetail`, so the supplier change automatically covers the admin view (confirmed in `src/App.tsx`).
- Also embedded as a recap inside `CounterOfferModal` — left untouched.

## What changes

### 1. Move it out of the right column → full-width, above the rounds card

On both Buyer and Supplier detail pages, render `PriceHistoryTable` as a standalone full-width block placed:

- Below the existing top banners (note from buyer/supplier, `DealClosedBanner`, final round / expired warnings).
- Above the `<div className="nd-grid">` two-column layout that holds the round card and `DealProgressionCard`.

Result: full page width, never cramped, sits naturally above the round/deal cards on every perspective.

### 2. Redesign the card visual to match the screenshot

Update `src/components/negotiation/PriceHistoryTable.tsx` so it renders:

- Header bar with a small document icon + bold title "Price details — full history" on the left, and a right-aligned summary chip "Asking + N rounds · $<startTotal> → $<currentTotal>".
- A grouped header row (visually segmented per round):
  - `PRODUCT | QTY (LB) | START · ASKING | ROUND 1 (BID | COUNTER) | ROUND 2 (BID | COUNTER) | … | ROUND N · FINAL`
  - Last round labelled `ROUND N · FINAL` when it equals `MAX_DISPLAY_ROUNDS` (4).
  - Round group cells share a subtle banded background to read like a grouped column.
- Per-product rows: product name (bold) + pack subtitle, quantity in selected unit, asking price, then each round's Bid (green) and Counter (red/pink with soft pill background) — `—` when missing. Preserves the existing 🔒 / "Agreed at" badge logic.
- A bold "Total value" footer row that multiplies each price column by total kg and sums across products, so the user can scan totals horizontally just like in the reference.
- Horizontal scroll fallback for narrow viewports / 4-round case (`overflow-x:auto`), with sticky first column so the product name stays visible while scrolling.

### 3. Styling

Add the new styles to `src/styles/negotiation-detail.css` (where the other `.nd-*` rules live) under a new `.nd-price-history` namespace:

- Card chrome (rounded border, soft shadow) matching other `.nd-card` blocks.
- Round-group banding (`background: hsl(var(--muted) / 0.4)` on header + zebra on the round cell pair).
- Bid cell color = success token; Counter cell = destructive token; counter pill = destructive @ low opacity.
- Sticky `PRODUCT` column (`position: sticky; left: 0`).
- Footer total row separated by a top border, bold.

All colors via existing HSL semantic tokens — no hard-coded hex.

### 4. Props / API

`PriceHistoryTable` keeps the same props (`products`, `maxRoundShown`, `agreedByName`, optional `i18nPrefix`). Internally it now also computes:

- `startTotalUsd = Σ asking * qtyKg`
- `currentTotalUsd = Σ (lastKnownPricePerKg) * qtyKg` (uses agreed price if locked, else last counter, else last bid, else asking)

These feed the header summary chip. No callers need to change.

### 5. Out of scope

- No changes to negotiation business logic, RPCs, rounds engine, or to the `CounterOfferModal` embedded recap.
- No data-model changes.

## Files touched

- `src/components/negotiation/PriceHistoryTable.tsx` — redesigned markup + header summary + totals row + sticky column.
- `src/styles/negotiation-detail.css` — new `.nd-price-history` styles.
- `src/pages/buyer/BuyerNegotiationDetail.tsx` — move render call above `.nd-grid`.
- `src/pages/supplier/SupplierNegotiationDetail.tsx` — move render call above `.nd-grid` (covers admin view too).
