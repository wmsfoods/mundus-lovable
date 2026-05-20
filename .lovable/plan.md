## Goals

1. Allow uploading/changing a **photo** on each contact card (main + additional), editable in edit mode.
2. Replace the free-text **Role** field on Additional contacts with a **dropdown** whose options depend on the company's `leadType`.

## 1. Editable photo on contact cards

- Extend `ProspectContact` in `src/hooks/useAdminProspects.ts` with `photoUrl?: string`.
- In `AdminProspectDetail.tsx` `ContactBlock`, render an avatar at the top-left of the card:
  - View mode: circular `<img>` if `photoUrl`, otherwise initials fallback (reuse `.crm-detail-av` style at ~56px).
  - Edit mode: same avatar with a small camera overlay button → opens a hidden `<input type="file" accept="image/*">`. On change, convert to data URL via `FileReader` and call `onChange(c.id, "photoUrl", dataUrl)`. Also show a "Remove" link if a photo exists.
- Apply to both the **Main contact** block and each **Additional contact** card (same `ContactBlock` already serves both).
- Add minimal CSS in `src/styles/mundus-prospect.css` for `.psp-contact-photo`, `.psp-contact-photo-edit-btn`, and a `psp-contact-row` flex wrapper so the photo sits beside the existing `psp-grid-2`.

Out of scope: persisting uploads to storage (mock store keeps data URLs in memory, consistent with the rest of the prospect mock).

## 2. Role dropdown by lead type (Additional contacts only)

Add a constant in `AdminProspectDetail.tsx`:

```ts
const ROLE_OPTIONS: Record<LeadType, string[]> = {
  buyer: ["CEO","Owner/Founder","Sales Director","International Trader","Logistics"],
  supplier: ["CEO","Owner/Founder","Purchase Director","Procurement","Logistics"],
  buyer_supplier: ["CEO","Owner/Founder","Operations","Director"],
};
```

In `ContactBlock`, when `showRole` is true:
- Pass current `leadType` as a prop (from `d.leadType`).
- Edit mode: render `<select className="psp-input">` populated from `ROLE_OPTIONS[leadType]`, with an empty `—` option and an "Other…" option that swaps the field to a free-text input (covers legacy values like the seeded "Director" not in the new lists).
- If the contact already has a `role` value that isn't in the list, keep it selected and visible (extra option at top labeled with the existing value).
- View mode: unchanged (plain text).

Main contact block is unaffected (it doesn't show role).

## Files

- `src/hooks/useAdminProspects.ts` — add `photoUrl?: string` to `ProspectContact`.
- `src/pages/admin/AdminProspectDetail.tsx` — photo upload UI in `ContactBlock`, `ROLE_OPTIONS` map, role `<select>` wired to lead type, pass `leadType` prop down.
- `src/styles/mundus-prospect.css` — styles for the contact photo + edit overlay.

## Not changed

- No DB migration (the prospect store is in-memory mock).
- No i18n keys added — role option labels are short proper-noun strings; if you want them translated, say so and I'll add `admin.crm.detail.contactRoles.*` keys.
