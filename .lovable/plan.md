## Goal

Refit the negotiation **detail** page (`/supplier/negotiations/:id` and `/buyer/negotiations/:id`) to the reference screenshot: same blocks, but tighter layout, a horizontal connected **Round timeline**, color-coded **Bid / Counter** pills, and a redesigned **bid card** (stats + gap bar + action row + buyer/supplier info table stacked together on the left).

No new functionality, no data changes. Pure CSS + light JSX restructure. Identical treatment on both buyer & supplier sides (mirrored copy).

## Reference (from screenshot)

- Pink "← Back to negotiations" link
- White **header card**: small pink rounded square with meat icon, title + "ID 00091c · Opp_Wms #01228 · Seoul Wagyu Co.", right side: amber `⏱ 9h 22m` pill + amber **Action required** pill
- **Meta chips** row (Incoterm, Destination, Port, Payment, FCLs, Weight) — subtle outlined pills, value bold
- **Two-column grid** (left ~1fr / right ~1.3fr):
  - **LEFT** (one tall white card containing everything):
    - Black "Round 2 of 3" badge + right-aligned `Updated May 18, 2026`
    - Sentence: "Seoul Wagyu Co. placed a bid in round 2. Reply with a counter, accept, or reject."
    - 3 inline stat boxes: ASKING / BUYER BID / **YOUR COUNTER** (last one green-tinted)
    - "Bid vs Counter gap" row + signed delta (green)
    - Gradient blue→green bar with circular knob, "BID" / "COUNTER" labels
    - Action row: big pink **⇄ Send counter-response** (2fr) + green **✓ Accept bid** (1fr, light green bg) + outlined **✗ Reject** (1fr)
    - Divider, then a **definition list table** for buyer info (Buyer, Avg reply time, FCLs · Weight, Value per FCL, Movement) — left label / right value rows, last row red
  - **RIGHT** (two white cards):
    - **Round timeline** card: header "❄ Round timeline" + right text "2 of 3 rounds". Body = horizontal flow of pills: `Bid 1 $122,550.00` (blue bg) → arrow → `Counter 1 $126,800.00` (green bg) → arrow → `Bid 2 $124,510.00` (blue) → arrow → `Counter 2 · current $126,100.00` (darker green outline)
    - **Price details** card: table with columns PRODUCT / QTY (LB) / ASKING / BID R1 / COUNTER R1 / BID R2 / COUNTER R2. Bid columns text in **blue**, counter columns text in **green** (current round bolder).

## Changes

### 1. `src/styles/mundus-negotiations.css`
- Adjust `.nd-grid` to `grid-template-columns: 1fr 1.3fr` (was `1.5fr 1fr`) so the price table side is wider.
- Merge the round/bid card and the buyer/supplier info card into one visual card: keep two `.nd-card`s but make the second one (info) appear as a continuation — remove top border + reduce top padding when class `.nd-card--joined` is set. Add a thin top divider.
- Restyle `.nd-stats .nd-stat`: lighter border, smaller label, larger value, `.highlight` uses light green bg `#ecfdf5`, green border `#bbf7d0`, value color `#15803d`.
- `.nd-gap-bar`: keep gradient, add a `::after` circular knob positioned via inline `--knob` CSS var (set from JSX based on gapPct clamped 0–100). Add `BID` / `COUNTER` labels in bold small caps.
- Action buttons:
  - `.btn-counter`: keep brand pink, full bold, taller (12px 16px)
  - `.btn-accept`: change to **light-green filled outlined** style — bg `#dcfce7`, color `#15803d`, border `#86efac` (matches screenshot's lighter green chip)
  - `.btn-reject`: outline only with red `✗` icon color `#dc2626`, text fg
- New `.nd-timeline-flow` (replaces vertical `.nd-timeline`): horizontal flex with `→` separators, pills with rounded radius 8px, padding 8px 12px, font 13px. Color variants:
  - `.tl-pill--bid` bg `#dbeafe` color `#1e40af`
  - `.tl-pill--counter` bg `#dcfce7` color `#166534`
  - `.tl-pill--current` border `2px solid #16a34a`, bg `#bbf7d0`
  - Add `.nd-timeline-head` with title + right "X of Y rounds"
- `.nd-price-table`: keep structure; add column color rules — `.col-bid` blue `#2563eb`, `.col-counter` green `#16a34a`, `.col-counter--current` bolder; numbers right-aligned; product cell has name (semi-bold) + pack (muted xs).
- Header avatar: `.nd-header .nd-avatar` → smaller (44×44), bg `#fde2e7`, color `var(--brand)`, contains an emoji/icon, radius 10px (matches screenshot's pink soft tile).
- Header title size 20px (was 24px) to match denser look. Subtitle ID in monospace.

### 2. `src/pages/supplier/SupplierNegotiationDetail.tsx`
- Replace avatar text initials with `<UtensilsIcon>` (or existing meat-ish icon) inside the pink tile.
- Merge buyer info card into the same left column directly under the round card by passing `nd-card--joined` to it.
- Replace vertical `.nd-timeline` block with new horizontal `.nd-timeline-flow`: render each entry from `d.rounds` as a pill with classes by `r.type` and `r.isCurrent`, with a `→` between them. Add header "Round timeline" + right-side "{round} of {max} rounds".
- Add a small `❄` (or `Sparkles` icon) before "Round timeline" title.
- Update `.nd-gap-bar` to receive `style={{ ['--knob' as any]: `${clamp(gapPctRelative, 0, 100)}%` }}` — knob position computed from `gapPct` (mapped to 0–100 range; if negative clamp to left).
- Add `col-bid` / `col-counter` / `col-counter--current` classes to the price table cells per round/type so column colors apply.
- Keep all i18n keys; no text changes.

### 3. `src/pages/buyer/BuyerNegotiationDetail.tsx`
- Same restructure as supplier, mirrored (already inverts buyer↔supplier terminology). Color logic flipped:
  - `Bid` (buyer's own bid) → green pill (own action)
  - `Counter` (supplier counter) → blue pill
  - Or keep the screenshot's convention (Bid=blue, Counter=green) regardless of role — **chosen**: keep convention consistent with screenshot so columns stay readable across both sides.
- Use a `BuildingIcon`/store icon in the pink avatar tile (buyer is looking at a supplier).
- All existing buyer i18n keys remain; no copy changes.

### 4. No new files, no route or data changes
- Reuse existing icons in `src/components/icons` (search for `Sparkles`, `Utensils`, etc.; fall back to `ArrowsLeftRightIcon` or add a tiny inline SVG if missing).
- No changes to hooks, mock data, or i18n JSON.

## Out of scope
- List pages (`/supplier/negotiations`, `/buyer/negotiations`) — untouched.
- Any other page, shell, or foundation file.
- Real backend actions (still toasts).

## Acceptance
1. `/supplier/negotiations/b-04` and `/buyer/negotiations/<any>` render with the screenshot's layout: tight header w/ pink icon tile, meta chips, two-column grid (left = single tall card with stats + gap bar + actions + info table; right = horizontal timeline pills + price table).
2. Timeline is one horizontal flow with arrows; Bid pills blue, Counter pills green, current counter has thicker green border.
3. Price-table bid columns are blue, counter columns green, current-round counter bold.
4. Send counter-response is the wide pink button; Accept bid is the light-green pill button; Reject is outlined with red ✗.
5. Layout collapses cleanly under 1024px (single column) and 640px (action buttons stack).
6. Buyer side mirrors the same visual treatment with buyer-perspective copy unchanged.
