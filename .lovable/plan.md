# Visual/DOM Audit — Findings & Normalization Plan

Scope: all CSS under `src/styles/` powering Supplier, Buyer, and Admin pages.

## Findings

### 1. Fonts — mostly OK, 3 leaks
Global font is Inter (`var(--font-sans)` in `index.css`). Issues found:
- `mundus-negotiations.css:256` — `.nd-header .nd-sub .mono` uses raw `ui-monospace, SFMono-Regular, Menlo, monospace`.
- `mundus-insights.css:247, 253, 391` — three rules (`.sa-top__rev`, `.sa-geo__count`, one more) use raw monospace stack.
- `mundus-admin.css` correctly uses `var(--font-mono)` — that's the canonical token.

Fix: replace raw `ui-monospace,...` with `var(--font-mono)` so all numeric/mono displays share one token.

### 2. Brand color — `--p800` is canonical but many files still use legacy fallbacks

The token `--brand: var(--p800)` is set globally, but several stylesheets still write `var(--brand, #be123c)` (52 occurrences across 6 files) or hardcoded magenta variants. The fallback `#be123c` is wrong (off-brand) and resolves only if `--brand` is ever unset.

Hardcoded off-brand hover/active variants:
- `mundus-create-offer.css` — `#9d174d` used as hover (lines 166, 221).
- `mundus-insights.css:418` — `.ins-upsell-btn--primary:hover { background: #8a3550 }`.
- `mundus-shell.css:137` — `background: #8a3550`.
- `mundus-supplier-offers.css:172` — `color: #9d174d`.
- `mundus-insights.css:78` — gradient `#B64769 → #8a3550` hardcoded.

Canonical brand palette in use elsewhere: `--p800` (base), `--p900` (hover), `--p700` (lighter).

Fix:
- Replace every `var(--brand, #be123c)` with `var(--p800)` (no fallback) across `mundus-create-offer.css`, `mundus-chat.css`, `mundus-company.css`, `mundus-requests.css`, `mundus-negotiations.css`, `mundus-tables.css`.
- Replace hardcoded `#9d174d` and `#8a3550` hover states with `var(--p900)`.
- Replace gradient endpoints in `mundus-insights.css:78` and any banner gradients with `var(--p800)`/`var(--p900)`.

### 3. Hover states — inconsistent
- Buttons sometimes hover to `#9d174d`, sometimes to `#8a3550`, sometimes have no hover.
- Standardize all brand button hovers to `background: var(--p900)` and keep border-color in sync.
- Standardize ghost/secondary hovers to `background: var(--p50)` or `rgba(182,71,105,0.06)` (already used in create-offer) — pick one. Recommend `var(--p50)` if defined, otherwise keep the rgba.

### 4. Semantic status colors — OK to leave as-is
`mundus-requests.css` and `mundus-tables.css` use green/red/amber hex values for status pills (won/lost/pending/active). These are semantic, not brand — leave untouched unless we want to introduce `--success`, `--danger`, `--warning` tokens (out of scope for this audit).

### 5. White (`#fff`) usage — leave as-is
~40 occurrences of `#fff` for card backgrounds and button text on dark fills. Token-izing to `var(--surface)` is a separate refactor; not part of this audit.

## Implementation Steps

1. **Fonts** — sed-replace raw monospace stacks with `var(--font-mono)` in `mundus-negotiations.css` and `mundus-insights.css` (3 lines).
2. **Brand color** — global find/replace `var(--brand, #be123c)` → `var(--p800)` in all 6 affected stylesheets.
3. **Hover normalization** — replace `#9d174d` and `#8a3550` literals used as hover/active with `var(--p900)`. Update the insights hero gradient (`#B64769 → #8a3550`) to `var(--p800) → var(--p900)`.
4. **Spot-check supplier-offers** — already audited in the previous commit; verify it stays consistent (one stray `#9d174d` on line 172).
5. **Visual QA** — browser screenshots of Supplier Home, Supplier Offers, Supplier Create Offer, Supplier Negotiations, Buyer Requests, Buyer Insights, Admin Dashboard at desktop + mobile widths. Confirm primary buttons, hovers, links, and gradients render in the `--p800/--p900` family.

## Out of Scope
- Refactoring `#fff` to surface tokens.
- Introducing `--success/--danger/--warning` semantic tokens.
- Layout, spacing, or component structure changes.
