## Goal
Apply consistent container vs. quantity rules to both `BuyerCreateRequest.tsx` and `SupplierCreateOffer.tsx`.

## Rules
- **Container count**: max 20 units. Input clamped 1–20; values above show inline error and are rejected.
- **Capacity per container**: 20' FCL = 14.000 kg / 40' FCL = 28.000 kg. Hard cap is **28.000 kg per container** (≈61.729 lbs). Sum of items / container count cannot exceed this — block publish with a clear error.
- **Auto-upgrade 20' → 40'**: if total kg per container exceeds 14.000, automatically switch selection to 40' FCL and show toast "Quantity exceeds a 20' FCL — switched to 40' FCL".
- **Manual click on 20' when qty doesn't fit**: block selection and show message "Due to the quantity, this must be a 40' FCL container".
- **Manual 40' when qty fits in 20'**: allowed, but display a yellow note "Quantity fits in a 20' FCL — a 40' was selected. The supplier will see this note." Persist this hint and surface it on the Supplier offer detail (read from `notes` / new field, simplest: append to existing observation/notes string with a prefixed tag, no schema change).

## Files
- `src/pages/buyer/BuyerCreateRequest.tsx`
  - Replace existing `CONTAINER_KG` map (currently 14000/28000 — keep) with capacity helper.
  - Wire `containerCount` input to clamp 1–20.
  - Add `useEffect` watching `totalKg` + `containerCount` to auto-bump `containerType` from "20" → "40".
  - Intercept `setContainerType("20")` click handler with capacity check.
  - Add inline notice block under the CONTAINER pills.
  - Add publish guard in `handlePublish` enforcing 28.000 kg × count hard cap.
- `src/pages/supplier/SupplierCreateOffer.tsx`
  - Same logic on `csize` / `containerCount` (`containerCapacityKg` helper already exists in `src/lib/units.ts`).
  - Cap `containerCount` at 20.
  - Same auto-upgrade + click-block + soft note behaviors.
  - Publish guard.

## UX details
- Notices rendered as small chips below the container selector using existing `.bcr-pill` / `.cov4-cfg-*` classes — no new CSS files.
- Toasts via existing `useToast` (already imported in both files).
- Units: rules are evaluated in **kg internally** (state is always kg); lbs display only.

## Out of scope
- Schema changes. The supplier-visible note will piggyback on the existing observation field for the buyer side; if you'd prefer a dedicated column tell me before implementation.
