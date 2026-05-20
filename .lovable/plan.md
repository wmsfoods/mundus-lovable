## Convert Prospect → Mundus Company

Add a "Convert to Mundus" action on the Prospect detail page that turns the prospect into a real Mundus Company as **Buyer**, **Supplier**, or **Buyer + Supplier**. After conversion, the prospect is marked as onboarded (cannot be deleted, only deactivated) and a reference to the new company is stored.

### Scope
- Admin-only, on `/admin/crm/prospects/:id` (`AdminProspectDetail.tsx`).
- Mock-store only for now (consistent with the rest of Prospect features). Real DB write to `companies` will plug in later when CRM ↔ Companies is wired end-to-end.

### UI

1. **New header button** "Convert to Mundus" next to Edit / Deactivate / Delete.
   - Visible only when: `p.isActive` AND `!p.isOnboarded` AND `!p.mundusCompanyId`.
   - Style: `crm-btn-primary` with a `Building2` (or `ArrowRightCircle`) icon.

2. **Conversion modal** (reuses existing modal pattern from Deactivate):
   - Title: "Convert to Mundus Company".
   - Subtitle: prospect company name + country.
   - Choice (radio cards, single-select, required):
     - Buyer Mundus
     - Supplier Mundus
     - Buyer + Supplier Mundus
   - Read-only summary of fields that will be carried over: name, country, city/state/zip, website, phone (from main contact), industry.
   - Master user section: pre-filled from the prospect's main contact (full name, email, phone). Editable inline. This is the company's first user (master).
   - Warning callout: "Once converted, this prospect becomes a Mundus Company and can no longer be deleted — only deactivated."
   - Buttons: Cancel / Confirm conversion.

3. **After confirmation**:
   - Toast success: "Converted to Mundus Company".
   - Header gains the existing `Onboarded` pill (already rendered when `isOnboarded`).
   - Delete button becomes disabled with the existing onboarded tooltip.
   - A new activity entry is added: `Converted to Mundus Company (Buyer|Supplier|Both). Master user: <name>`.
   - Stage auto-moves to `onboarded`.

### Data (mock store — `useAdminProspects.ts`)

Add a new mutation:

```ts
convertProspectToMundus(id, {
  type: "buyer" | "supplier" | "buyer_supplier",
  master: { fullName, email, phone? }
}): { ok: boolean; mundusCompanyId?: string }
```

Effects on the prospect:
- `isOnboarded = true`
- `mundusCompanyId = "mc-<id>-<timestamp>"`
- `stage = "onboarded"` (+ stage_change activity)
- `leadType` is updated to match the chosen type
- Prepend a `system` activity describing the conversion + master user

Mundus-side mock (so the rest of the app can later read it):
- Add a tiny in-memory list `MUNDUS_COMPANIES` in the same hook file (or a new `useMundusCompanies.ts`) storing `{ id, name, country, isBuyer, isSupplier, masterUser, sourceProspectId, createdAt }`. Not consumed yet by other screens; placeholder for the future hookup to the `companies` table.

### i18n
Add keys under `admin.crm.detail`:
- `actions.convert`, `convert.title`, `convert.type.buyer|supplier|both`, `convert.master.title|name|email|phone`, `convert.warning`, `convert.confirm`, `convert.toast`.
Add to `en.json`, `pt.json`, `es.json`.

### Out of scope (this turn)
- Real insert into the `companies` table — kept mock-only. When we wire the real backend, `convertProspectToMundus` becomes a Supabase insert into `companies` (+ `company_users` for the master) and the rest of the UI stays the same.
- Creating the actual auth user / sending invite email for the master.

### Files
- `src/hooks/useAdminProspects.ts` — add `convertProspectToMundus` + Mundus mock list.
- `src/pages/admin/AdminProspectDetail.tsx` — new button, new modal, wiring.
- `src/styles/mundus-prospect.css` — small styles for the convert modal radio cards.
- `src/i18n/locales/{en,pt,es}.json` — new keys.
