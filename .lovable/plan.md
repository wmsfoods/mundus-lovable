## Goal

Make the **Prospect record screen** (`AdminProspectDetail`) and the **C-Level records** (`CLevelModule` cards, KPIs, filters) feel native on mobile (≤768px), matching the polish we already shipped for `AdminCompanies` and the negotiations mobile pass. Desktop is untouched.

## Scope (mobile only, ≤768px)

### 1. Prospect detail — `src/pages/admin/AdminProspectDetail.tsx` + `src/styles/mundus-prospect.css`

Header card:
- Stack the header vertically: avatar centered, name + country/id under it, action buttons in a full-width 2-column grid (Edit / Enrich / Deactivate / Delete / Search / Convert / Save / Cancel) so nothing overflows.
- Increase tap targets to 40px min, icon + label, ellipsis for long names.
- `crm-chips` becomes a horizontal scroll strip (`overflow-x:auto`, hide scrollbar) so stage/lead/source/owner chips never wrap into 3 lines.
- `psp-chip-select` already 36px on mobile — keep, ensure inline with chips.

Body sections:
- Reduce `adm-panel` side padding to 12px on mobile (currently inherits desktop spacing).
- `psp-grid-2` already collapses to 1 column — keep, but tighten gap to 8px and bump input height to 40px for thumb-friendliness.
- `ContactBlock`: photo centered above the field grid (already done), but add `psp-contact-row--mobile` rule so the photo wrap takes full width with the name aligned center, and the inline pencil/remove buttons get readable hit-areas.
- Additional contacts list: the floating "X" delete becomes a full-width "Remove contact" outlined button at the bottom of each card in edit mode.

Notes & Activity:
- `crm-detail-grid` already stacks at ≤1000px — confirm and reduce gap.
- Timeline events: smaller dot column, allow body to wrap (`crm-evt-line` switches to column on mobile).

Drawers / Modals (Deactivate, Delete, Convert, SearchPeople):
- `psp-scrm-modal` already goes full-screen at ≤900px — extend the same to `.psp-drawer` body padding, footer becomes sticky with safe-area inset, primary button full width.
- SearchPeople drawer: reveal/copy/LinkedIn pills wrap two per row; "Add" button moves below the contact name on small widths.

### 2. C-Level records — `src/components/admin/CLevelModule.tsx`

KPI strip:
- On mobile, switch the 5-card auto-fit grid to a single horizontal scroll row (`overflow-x:auto`, no-shrink `min-width: 140px` chips) — matches the pattern requested earlier for funnel tiles.

Filters bar:
- On mobile: search input full-width (own row), the three `<select>` filters share a row that scrolls horizontally; Country popover trigger becomes full-width pill.
- All selects: height 40px, font 13px.

Card row (`CLevelCardRow`):
- Move all inline `style={{...}}` typography/spacing values to a new `.clvl-card` block in `mundus-prospect.css` for consistency and clean overrides.
- Layout: avatar 40px left, identity stack right; row of pills (Domain match + Qualified status) wraps below; action row pinned at the bottom with `display:grid; grid-template-columns: 1fr 1fr; gap:8px;` on ≤480px so buttons share width evenly (View / Qualify / Enrich / → Buyer / → Supplier).
- "Qualify →" expanded state: Buyer & Supplier buttons take 50/50, Cancel becomes a small ghost link below.
- Long emails ellipsis with `title` tooltip.

Pagination: center, full width on mobile, larger hit areas (already mostly fine — verify).

### 3. CSS additions — `src/styles/mundus-prospect.css`

New mobile-scoped rules grouped under a single `@media (max-width: 768px)` block:
- `.crm-detail-head` → column, centered avatar.
- `.crm-header-actions` → grid 2 cols, gap 8.
- `.crm-chips` → horizontal scroll, no-wrap.
- `.adm-panel` (inside `.psp-…` page only) → padding 12.
- `.psp-contact-card` → padding 10, contact delete becomes block button.
- `.clvl-kpis` → horizontal scroll row.
- `.clvl-filters` → search row + scroll row of selects.
- `.clvl-card` and `.clvl-card-actions` → unified card chrome and grid action footer.

No desktop selectors touched. No business logic, data fetching, or component contracts changed.

### Out of scope
- Pipeline kanban, Add/Import modals (already mobile-tuned).
- Desktop styling.
- Any data model, query, or RLS changes.

## Verification
- Resize preview to 390×844 and 360×800, walk through: prospect detail (view + edit), contact add/remove, Search People drawer, Convert modal, C-Level list with KPIs/filters/cards, qualify flow. Confirm no horizontal page scroll and all buttons remain reachable.
