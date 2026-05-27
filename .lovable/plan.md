## Goal

Make the **Admin → Company Detail** page look and feel exactly like the **Prospect Detail** page (header avatar + inline-edit name + chip bar + stacked panels), while keeping **all current company fields, tabs, validations, save/delete/role logic and team management** intact.

## What changes (visual / layout only)

Refactor `src/pages/admin/AdminCompanyDetail.tsx` so the **Profile tab** mirrors the prospect detail structure:

1. **Header panel** (replaces current `adm-page-header`)
   - Back link `← Companies` (top-left, `adm-link`)
   - Row: `crm-detail-av` avatar with company initials + inline-editable company name (`psp-input` when editing) + subtitle `Country · #company_number`
   - Right-aligned actions: Edit / Cancel+Save (Save uses Mundus wine `#8B2252`), plus Delete (with the same "cannot delete if has data" guard already in the file)
   - Chip bar `crm-chips` below the title showing:
     - Active/Inactive pill (`stage-qualified` / `stage-lost`)
     - Buyer / Supplier / Buyer+Supplier pill (editable select while editing → toggles `is_buyer`/`is_supplier`)
     - Verified pill (when `is_verified`)
     - Status select (active / inactive / etc.) — already in admin section, promoted to chip
     - "Created: …" chip with `onboardedDisplay`
   - Editing toggles the same `dirty` flag and Save handler that exists today.

2. **Tabs bar** stays unchanged (same `adm-company-tabs` with Profile / About / Plants / Certifications / Documents / Team / Preferences). Only the Profile tab body is restyled.

3. **Profile tab body** — replace the current `adm-form-grid` Sections with prospect-style panels:
   - **Company information** panel (`adm-panel` + `psp-grid-2`): Lead type (Buyer/Supplier/Both, derived from `is_buyer`/`is_supplier`), Industry (new free-text — already optional, fall back to placeholder if not in schema → keep only fields that exist in `CompanyPatch`; map: Company name, Tax ID, Country, State, City, Street/Address (with `AddressAutocomplete`), Zip, Phone, Website, Company LinkedIn (only if field exists; otherwise omit).
   - **Protein & Cuts** panel (kept, same logic as today, just wrapped in `adm-panel` with the panel title pattern).
   - **Admin** panel (Verified toggle + Status select + Rating) — only when editing existing record.
   - Each field uses the prospect's `Field` read/edit pattern (label + value in view mode, input in edit mode) so the page looks identical to prospects when not editing.

4. **Activity + Notes row** (`crm-detail-grid`) at the bottom of the Profile tab — Activity left, Notes right. For companies we don't have activity log yet, so render:
   - Activity panel: empty state "No activity yet" (using `admin.crm.detail.noActivity` key) — no add-note button to avoid scope creep.
   - Notes panel: read-only display of `data.notes` when present, textarea in edit mode. If `notes` is not in `CompanyPatch`, skip this panel (verify when implementing).

5. **Delete confirm modal** — reuse the `psp-scrm-modal` markup from prospect detail instead of the current `AlertDialog`, so the look matches. Behavior (the `remove()` call + redirect to `/admin/companies`) is unchanged.

## What stays the same

- All **tabs** (About, Plants, Certifications, Documents, Team, Preferences) and their components (`CompanyProfileSections`, `CompanyTeamPanel`, etc.) — untouched.
- All **fields** currently on the form (Buyer/Supplier roles, Protein profiles, Preferred cuts, Company name, Tax ID, Country/State/City/Address/Zip/Phone/Website, Verified, Status, Rating, Licenses upload hint).
- **Validation**, `handleSave`, `handleDelete`, `auditLog`, `create` vs `edit` mode, dirty tracking, translations — no behavior change.
- The "new company" view (`isNew`) keeps the same fields but renders inside the new panel layout (no tabs bar, no delete).

## Files touched

- `src/pages/admin/AdminCompanyDetail.tsx` — rewrite header + Profile tab body using `adm-panel`, `crm-detail-head`, `crm-chips`, `psp-grid-2`, `crm-detail-grid` classes already defined in the prospect/CRM stylesheets. No new CSS file needed.

No DB changes, no new dependencies, no changes to other tabs or to the companies list page.