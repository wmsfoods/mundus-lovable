## Problem

In `src/components/buyer/BidModal.tsx`, the "Your Bid" inputs (desktop table and mobile cards) bind `value` directly to `displayBid.toFixed(2)`. On every keystroke the number is parsed → converted to kg → converted back → re-formatted to 2 decimals. This causes:

- Cursor jumps to the end while typing.
- Cannot delete the last digit cleanly (e.g. typing `12` instantly shows `12.00`, deleting a digit re-formats).
- In lbs mode every keystroke runs a round-trip kg/lb conversion which loses precision and "fights" the user.
- Decimal separator (`,` vs `.`) is awkward — the input forces `.` formatting after each key.

## Fix

Introduce a per-item **string draft** for the bid input so the field behaves like a normal text input while typing, and only commits to the numeric `bids` state on blur / Enter / bulk-apply.

### Changes in `src/components/buyer/BidModal.tsx`

1. Add new state `bidDrafts: Record<string, string>` next to `bids`.
2. Initialize / re-sync `bidDrafts` whenever `bids` change from external sources (hydration, bulk apply, incoterm change, accept asking, asking ±%). Format with `toFixed(2)` only at sync time, never during typing.
3. Replace both `<Input type="number">` blocks (desktop row + mobile card) with:
   - `type="text"` + `inputMode="decimal"` + `pattern="[0-9.,]*"` (keeps numeric keypad on mobile, prevents iOS zoom because font-size rule already applies).
   - `value={bidDrafts[it.id] ?? ""}`.
   - `onChange`: accept the raw string, normalize `,` → `.`, allow empty / partial values like `"12."` or `""`; store as-is in `bidDrafts`. Only parse to a finite number and update `bids` if the string is a valid complete number; otherwise set `bids[it.id] = null` so validation still shows "required".
   - `onBlur`: parse final value, clamp to 0+, format back to 2 decimals into `bidDrafts`, and write the kg-converted number to `bids`.
   - `onKeyDown` Enter → blur the input to commit.
4. Keep all existing display logic (diff line, error line) reading from the committed `bids` value, unchanged.
5. Select-all on focus (`onFocus={(e) => e.currentTarget.select()}`) so tapping the field makes it easy to overwrite.

### Out of scope

- No business-logic / validation changes.
- No styling overhaul beyond the input itself.
- CounterOfferModal / AuctionBidModal are not part of this request.

### Technical notes

- `fromDisplay` / `toDisplay` and `useWeightUnit` continue to gate the kg↔display conversion, but conversion now happens once on blur (or on external sync) rather than on every keystroke.
- The draft string is the single source of truth for what's rendered, so the caret no longer jumps.
