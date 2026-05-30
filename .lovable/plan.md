# Phase 3 — Office-aware Create Offer wizard

Make `SupplierCreateOffer.tsx` (used by both supplier and admin on-behalf) respect the active office: only offer plants and destination markets the office is allowed to use, record plant **per cut**, derive origin from plants, and tag the offer with `office_id`. Mobile-first, fully i18n (en/pt/es/fr/zh).

## 1. Migration (schema fix first)

New migration `*_offer_items_plant_id.sql`:
- `ALTER TABLE public.offer_items ADD COLUMN plant_id uuid REFERENCES public.company_plants(id);`
- `CREATE INDEX idx_offer_items_plant ON public.offer_items(plant_id);`
- `COMMENT ON COLUMN public.offers.plant_id IS 'DEPRECATED: convenience pointer to first cut's plant. Source of truth is offer_items.plant_id (supports Mix FCL across plants).';`
- No new RLS — `offer_items` write policy already scopes by family via parent offer. Plants are already family-scoped, so a cross-family `plant_id` would be rejected by the UI (and could be validated in a future trigger if abuse is seen).

## 2. New hooks

`src/hooks/useOfficeAllowedPlants.ts`
- Input: `officeId` (the acting office).
- Query `office_plants` joined with `company_plants` for that office. Filter `is_active = true`.
- Fallback: if no `office_plants` rows exist for that office, return ALL family plants (via `company_family_ids(officeId)` → `company_plants.company_id IN (...)`), plus a `fallback: true` flag so the UI can show the hint.
- Returns `{ plants, fallback, loading }`.

`src/hooks/useOfficeAllowedMarkets.ts`
- Same pattern using `office_markets` joined with `markets` + `countries`.
- Fallback to all markets if none configured, with `fallback: true`.
- Returns `{ markets, fallback, loading }`.

Both run under RLS — no special privileges needed.

## 3. Resolve the "acting office"

Inside the wizard, compute `actingOfficeId`:
- Admin on-behalf (`?as_company=...`) → that company id.
- Global director in "All Offices" mode → none yet → show **office picker** (§6) before the wizard content; once chosen, that id is the acting office for the session.
- Otherwise → `activeOfficeId ?? company.id` (existing behavior).

Store in local state `actingOfficeId`. Pass to `useOfficeAllowedPlants` / `useOfficeAllowedMarkets`.

## 4. Per-cut plant selector (core change)

In the cut row UI (existing "Plant" text field around line 2594) and in the "Add new cut" form (line 2832 area):
- Replace free-text/manual plant input with a **Select** populated from `allowedPlants`.
- Item label: `"{plant_number} · {name} {flag}"` (e.g. `421 · Barretos 🇧🇷`). Use `countryFlag()` from `@/lib/countryFlags`.
- Store the plant's `id` in `c.plant_id` (rename internal field from string `plant` → `plant_id`; keep `plant_number` for display/back-compat with `offer_items.plant_number`).
- If `fallback: true`, render a subtle hint above the cut list: *"Showing all group plants — office plant access not yet configured."*
- Validation: every cut must have `plant_id` set before Next/Publish. Add to the existing `validations` list (`{ key: "plants", label: "Select a plant for each cut", done: cuts.every(c => c.plant_id) }`).
- Hide the "Manage plant numbers" link for non-master operators (use `isMaster` from `useActiveOffice`). Keep visible for masters/admins/directors.

## 5. Derive Country of Origin from plants

- Compute `selectedPlantCountries = distinct(plants[c.plant_id].country)`.
- If length === 1 → set `originCountryVal` to that country, render the existing input as read-only with helper *"Origin: {country} — from selected plants"*.
- If length > 1 → show all distinct origins joined (`"Brazil, Paraguay"`) read-only; persist the first cut's plant country into `offers.origin_country`.
- Origin Port: if all selected plants share the same `origin_port_id`, pre-select that port in the Logistics step (user can still override).

## 6. Destination markets — scoped to office

- The destination country/market multiselect (around line 821, "matchedMarkets") must filter from `allowedMarkets` only.
- If a destination was pre-filled from a request that the office isn't configured for, show the chip with a warning style and a tooltip *"This office isn't configured to sell to {country} — ask your director to grant the market."* and **block publish** until removed.
- Destination Port options in Logistics follow naturally (already filtered by selected countries).
- Show the same `fallback: true` hint above the market chips if no `office_markets` configured.

## 7. Persist `office_id`

In `handlePublish`, set `office_id: actingOfficeId` (replaces today's `activeOfficeId ?? supplierId` fallback). For admin on-behalf, `actingOfficeId === as_company`. This closes the Phase 2 TODO so "My Offers" filtering by office works end-to-end.

Also write `offer_items.plant_id` (new column) and `offer_items.plant_number` (keep for now) from each cut row. Set `offers.plant_id` = first cut's `plant_id` (convenience; null if mixed and you prefer — choose first for compatibility with current reads).

## 8. Global Director office picker

New small component `SelectActingOfficeCard.tsx` rendered ABOVE the wizard when `isGlobalDirector && isAllOffices`:
- Lists the family's offices (from `useActiveOffice().offices`) as tappable cards (44px min height, flag + office name + HQ badge).
- On select → set `actingOfficeId` in local state; the wizard mounts/continues with that office's scopes.
- Sticky on mobile, plain card on desktop. If a director already focused a specific office in the switcher, skip the picker entirely.

## 9. Review step

Update the existing review block (around line 3021 where it currently shows `· Plant {c.plant}`):
- Per cut line: `"{cut name} — {qty} kg @ ${price}/kg · 🇧🇷 421 Barretos"`.
- Add an "Origin: ..." line derived from §5.
- Mobile: each cut renders as a stacked card with the plant chip under the cut name (no wide table).

## 10. i18n

Add keys under `supplier.createOffer.*` in all 5 locales (`en`, `pt`, `es`, `fr`, `zh`):
- `plantPerCut`, `selectPlant`, `plantRequired`, `originFromPlants`, `marketBlockedForOffice`, `fallbackPlantsHint`, `fallbackMarketsHint`, `pickActingOffice`, `pickActingOfficeHint`.

## 11. Constraints honored

- Security: UI only offers in-scope plants/markets; RLS already enforces at DB.
- Backward-compat: suppliers with no offices/office_plants see all family plants via fallback (with hint). Behavior preserved.
- No changes to negotiation/order flows. No changes to request-routing (Phase 3.5).
- Mobile-first: 44px tap targets, no clipped dropdowns (use existing `Select` from `@/components/ui/select` with `position="popper"`).

## Files

**New**
- `supabase/migrations/<ts>_offer_items_plant_id.sql`
- `src/hooks/useOfficeAllowedPlants.ts`
- `src/hooks/useOfficeAllowedMarkets.ts`
- `src/components/supplier/SelectActingOfficeCard.tsx`

**Edited**
- `src/pages/supplier/SupplierCreateOffer.tsx` (the bulk of the work)
- `src/i18n/locales/{en,pt,es,fr,zh}.json`

## Out of scope (this phase)
- Request-routing & per-office request assignment (Phase 3.5).
- Admin UI to configure `office_plants` / `office_markets` (assumed already present from Phase 1 setup; if missing, surface as a follow-up).
- Dropping `offers.plant_id` (left in place, only commented as deprecated).
