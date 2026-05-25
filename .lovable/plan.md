# Plan — Buyer Offer Detail: relocate Negotiate + add Close Deal

## 1. Move action buttons out of the top bar

In `src/pages/buyer/OfferDetail.tsx`:
- Stop passing `topActions` to `OfferDetailLayout` (no more buttons in the upper-right corner on desktop).
- Render the action buttons in a new row placed **below the hero card** by passing them through the existing `belowItems` slot of `OfferDetailLayout` (already supported in `OfferDetailLayout.tsx`), wrapped in a small container styled like a card-actions row (flex, gap, right-aligned on desktop, full-width stacked on mobile).
- The same logic that currently chooses between "🤝 Negotiate", "💬 View Negotiation", and "✅ Deal Closed" stays — only its position changes.

## 2. Add a "Close Deal" button (buyer only)

Next to the Negotiate button, render a secondary "✅ Close Deal" button. Visible only when:
- The offer is `active`, AND
- The buyer has no active negotiation that is already `bid_accepted` (no "Deal Closed" state).

On click, open a confirmation dialog using the existing `AlertDialog` from `@/components/ui/alert-dialog`:
- Title: "Close Deal"
- Description: "Are you sure? You can't undo this action afterwards."
- Buttons: "Cancel" and "Close Deal" (destructive style).

On confirm:
- Send an in-app notification to the supplier company using the existing `notifyCompanyUsers` helper from `src/lib/notifications.ts` (target = `offer.supplier_id`), with a `close_deal_request` type, a link back to the offer, and the buyer company name in the payload.
- Close the dialog.
- Show a success toast (sonner) with the message: "Request sent to supplier. You'll hear back about this negotiation soon."

No database schema changes. No persistent "close deal request" table for now — it is just a notification + toast, matching the user's "função simples" requirement.

## 3. Internationalization

Add new translation keys under `buyer.offerDetail` in all 5 locale files (`en.json`, `pt.json`, `es.json`, `fr.json`, `zh.json`):

- `closeDeal` — button label
- `closeDealConfirmTitle` — "Close Deal"
- `closeDealConfirmBody` — "Are you sure? You can't undo this action afterwards."
- `closeDealCancel` — "Cancel"
- `closeDealConfirm` — "Close Deal"
- `closeDealToast` — "Request sent to supplier. You'll hear back about this negotiation soon."

Portuguese version uses the exact phrasing provided by the user:
- `closeDealToast` (pt) = "Solicitação enviada ao supplier. Em breve você terá um retorno sobre essa negociação."

The existing "Negotiate" / "View Negotiation" / "Deal Closed" labels already use translation keys — no change needed there.

## 4. Styling

Add a small CSS rule (in `src/styles/mundus-offers.css`) for the new actions row, e.g.:

```text
.od2-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 12px 0 0;
}
@media (max-width: 640px) {
  .od2-card-actions { flex-direction: column; }
  .od2-card-actions .btn-tb { width: 100%; justify-content: center; }
}
```

The buttons keep the existing `btn-tb` styling, so Negotiate stays burgundy (`#8B2252`) and Close Deal gets a neutral/outline style to differentiate it visually.

## Files touched

- `src/pages/buyer/OfferDetail.tsx` — move buttons, add Close Deal handler + AlertDialog.
- `src/styles/mundus-offers.css` — `.od2-card-actions` helper.
- `src/i18n/locales/{en,pt,es,fr,zh}.json` — new translation keys.

## Out of scope

- Supplier offer detail page (Edit Offer button stays where it is — user only mentioned the buyer view).
- No DB migrations, no new tables, no edge function.
