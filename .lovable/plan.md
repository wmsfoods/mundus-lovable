# Mobile layout parity: Prospects + C-Level

Apply the existing `AdminCompanies` mobile-card pattern to `AdminProspects.tsx` and `CLevelModule.tsx`. Desktop layout, data, filters, and logic stay untouched. No new CSS rules — reuse `adm-only-desktop`, `adm-only-mobile`, `adm-cards-stack`, `adm-panel`, `pill`, `adm-chip`, `adm-table-av` already in `mundus-admin.css`.

## 1. AdminProspects.tsx

**Funnel tiles (mobile-friendly horizontal scroll)**
- On the existing `.crm-funnel-tiles` container, merge inline style: `overflowX: "auto"`, `flexWrap: "nowrap"`, `WebkitOverflowScrolling: "touch"`, `paddingBottom: 4`.
- On each tile button, add `flexShrink: 0`.

**Desktop/mobile split**
- Add `adm-only-desktop` to the className of the `<div className="adm-panel" style={{ padding: 0 }}>` that wraps the prospects table.
- Right after it (before the pagination row), insert:
  ```jsx
  <div className="adm-only-mobile adm-cards-stack">
    {list.map((p) => (
      <ProspectCardRow
        key={p.id}
        prospect={p}
        onOpen={() => nav(`/admin/crm/prospects/${p.id}`)}
      />
    ))}
  </div>
  ```

**New local component `ProspectCardRow`** (added at bottom of file, same pattern as AdminCompanies `CardRow`):
- Root: `div.adm-panel`, `onClick={onOpen}`, `style={{ padding: 12, display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}`.
- Left: initials avatar (`adm-table-av`, same size as desktop).
- Right (flex column, `flex: 1, minWidth: 0`):
  1. Row 1: company name (bold 14px, truncate) on left; `#company_number` muted 12px right-aligned if present.
  2. Row 2: country flag + `city, country` — muted 12px.
  3. Row 3: contact name 12px + inline 👔 badge when `hasCLevel`.
  4. Row 4: `pill buyer|supplier` + `pill stage-{stage}` chips inline.
  5. Row 5: Est. GMV muted 12px (if present), right-aligned.
  6. Row 6: last activity / `updatedAt` muted 11px.
- Reuse identical `t(...)` keys used in the desktop row.

## 2. CLevelModule.tsx

**Desktop/mobile split**
- Add `adm-only-desktop` to the panel wrapping the C-Level table.
- Right after, insert:
  ```jsx
  <div className="adm-only-mobile adm-cards-stack">
    {visibleRows.map((r) => (
      <CLevelCardRow
        key={r.id}
        row={r}
        domainMatch={domainMatches[r.id]}
        enrichingId={enrichingId}
        onViewCompany={(id) => nav(`/admin/crm/prospects/${id}`)}
        onQualify={qualifyAs}
        onEnrich={enrichOne}
      />
    ))}
  </div>
  ```

**New local component `CLevelCardRow`**:
- Root: `div.adm-panel`, `style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}`.
- Header row (flex, gap 12): initials avatar left; column right with full name (bold 14px) + 👔 inline, job title muted 12px, company name + flag muted 12px.
- Contact line: truncated email 12px; LinkedIn icon link if present (`stopPropagation` on click).
- Chips row: `DomainMatchBadge` (reused as-is) + status pill (Qualified green / Pending yellow — same classes as desktop).
- Action row at the bottom:
  - "View company" text button when `company_id` exists.
  - "Qualify →" toggles local `showQualify` state revealing inline "→ Buyer" / "→ Supplier" buttons calling `onQualify`.
  - "Enrich" button when not enriched, disabled while `enrichingId === r.id`.
- Replaces the `MoreVertical` dropdown on mobile only (desktop unchanged).

## What stays untouched

- All desktop markup, table columns, widths, sorting, filters.
- Data hooks, pagination state, qualify/enrich/bulk-delete logic.
- `mundus-admin.css` (no edits — only class usage).
- `DomainMatchBadge`, i18n keys.

## Technical notes

- Components are local functions, not exported, matching `AdminCompanies.CardRow`.
- Mobile/desktop visibility purely via existing `adm-only-*` classes (CSS media-query gated).
- No new files; no behaviour or backend changes.
