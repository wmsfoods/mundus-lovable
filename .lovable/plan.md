## Close Deal — Implementation Plan (no code changes yet)

### 0. Reality check on assumptions (READ FIRST)

While surveying the codebase I found two important mismatches between the brief and the real code. These need a decision before we build.

**a) There is no existing "supplier acceptance" order flow.** Orders are only created today by the DB function `public._finalize_negotiation_close`, always with `status = 'awaiting_payment'`. The current `orders` table actually has only one status in the DB (`awaiting_payment`); the default in the schema is `'pending_supplier'` but no row uses it, and there is **no** `awaiting_supplier_acceptance` order status in code or data — only i18n strings for that label exist (en/pt/es/fr/zh `buyer.orderDetail.status.awaiting_supplier_acceptance`). There is no supplier "Accept Order / Reject Order" Sale Detail UI today; `SaleDetail.tsx` is a read-only deal view.

  → We have two options to honor "reuse the EXISTING flow":
  - **Option A (recommended, minimal new schema):** treat "Close Deal from an Offer" as an **auto-bid + auto-accept negotiation** under the hood. We create a negotiation at full asking price using the existing `submit_initial_bid` RPC (already used by `BidModal`), then immediately call `accept_negotiation(..., 'buyer')`, which puts it in `pending_confirmation` (the real "awaiting supplier final acceptance" status today). The supplier's existing `SupplierNegotiationDetail` already shows the confirm/reject/counter actions for that status via `CounterOfferActions.ts` + `CounterOfferModal`. No DB migration, no new edge function, perfectly reuses the existing engine.
  - **Option B:** introduce a real `awaiting_supplier_acceptance` order status, a new RPC `create_direct_order(...)`, a new supplier Sale Detail "Accept / Reject Order" UI, and wire payments after acceptance. Larger surface, new migration.

  **Plan below assumes Option A.** Confirm before we start if you want Option B instead.

**b) Mobile push is not set up at all.** `capacitor.config.ts` has no PushNotifications plugin, no `@capacitor/push-notifications` dependency, and there is no `device_tokens` / `push_subscriptions` table. The "degrade gracefully" requirement is easy, but we need to either (i) install Capacitor PushNotifications + add a `device_push_tokens` table + a `send-push` edge function, or (ii) ship Close Deal now with email + in-app, and a TODO/stub for push that returns success when no tokens exist. Plan below scopes the full push setup as **Phase 2** and flags it explicitly.

---

### 1. Status model we will use (Option A)

- Buyer Close Deal from Offer → creates a `negotiations` row with status `awaiting_supplier`, single round at asking price, then transitions to `pending_confirmation` via `accept_negotiation(..., p_accepted_by='buyer')`. Supplier confirms via existing `confirm_negotiation` → `_finalize_negotiation_close` → order in `awaiting_payment`.
- Buyer Close Deal inside negotiation → same `accept_negotiation` RPC (`p_accepted_by='buyer'`) on the current negotiation, also lands in `pending_confirmation`.
- The buyer-facing label "Awaiting supplier acceptance" is purely a UI rename of `pending_confirmation` when `accepted_by='buyer'`. No DB status added.

This reconciles the brief: "awaiting_supplier_acceptance" is the **UI label**, `pending_confirmation` is the **authoritative DB value**.

---

### 2. Files to change

**Buyer entry point #1 — offer page**
- `src/pages/buyer/OfferDetail.tsx` (line ~538): replace the `alert(...comingSoonFlow)` with a new `CloseDealDialog` open. On confirm, call a new shared helper `closeDealFromOffer(offer, buyerCompanyId, userId)` that:
  1. Builds `items` from `offer.items` at asking price + asking quantity.
  2. Calls `supabase.rpc('submit_initial_bid', { ... })` (mirrors `BidModal.tsx:319`) with freight=0, current incoterm/port defaults.
  3. Awaits the returned `negotiation_id`, then calls `acceptNegotiation(rawNeg, 'buyer')` from `src/components/supplier/CounterOfferActions.ts`.
  4. Fires notification fan-out (see §4).
  5. Navigates to `/buyer/negotiations/:id` (existing route → shows "awaiting supplier confirmation" state already implemented).
- Button label: replace `t("buyer.offerDetail.placeOrder")` with `t("common.closeDeal")` (new shared key).

**Buyer entry point #2 — negotiation detail**
- `src/pages/buyer/BuyerNegotiationDetail.tsx`: there is already an Accept button calling `acceptNegotiation(rawNeg, "buyer")` (line 115). We will:
  - Rename the button text to `t("common.closeDeal")`.
  - Wrap its click in the new `CloseDealDialog`.
  - Reuse the same notification fan-out (or rely on existing `dealAwaitingConfirmation` email already wired inside `acceptNegotiation`).

**New shared dialog**
- `src/components/common/CloseDealDialog.tsx` — controlled dialog using existing modal styling (`mundus-modal.css`), reading title/body/confirm/cancel from i18n.

**Shared helper**
- `src/lib/closeDeal.ts` — `closeDealFromOffer(...)` and `closeDealFromNegotiation(neg)` wrappers that centralize the RPC choreography + notifications, so both pages share code.

**Supplier accept/reject/counter (verify only — minor fix)**
- `src/pages/supplier/SupplierNegotiationDetail.tsx` already supports Accept (line 127) and opens `CounterOfferModal` (line 461). Verify that:
  - Reject is shown when `current_round >= MAX_DISPLAY_ROUNDS` (final phase) AND when status is `pending_confirmation` and buyer accepted. Adjust `getMaxRaw`/`isCounterExhausted` gating in the existing UI so Reject appears in the **final** round only (today it may appear earlier — confirm and tighten).
  - Counter button is enabled as long as `!isCounterExhausted(neg)` (i.e. rounds < `MAX_RAW_ROUNDS = 8` → 4 display rounds). Already implemented in `src/lib/negotiationEngine.ts`; verify the button is not hidden when status is `pending_confirmation` with `accepted_by='buyer'` — the supplier must still be able to counter if rounds remain. This may require relaxing the gate in `SupplierNegotiationDetail.tsx` to allow countering against a buyer "Close Deal" when `current_round < MAX_DISPLAY_ROUNDS`.
  - Accept path already works via `acceptNegotiation` + `confirmNegotiation` → order with `awaiting_payment`. No change needed.

**i18n — 5 locales**
- Files: `src/i18n/locales/{en,es,fr,pt,zh}.json`.
- Add namespace `common.closeDeal` (button label) and `common.closeDealDialog.{title,body,confirm,cancel}` with the exact strings from the brief.
- Keep `buyer.offerDetail.placeOrder` for backward-compat but stop referencing it; remove `comingSoonFlow` usage in `OfferDetail.tsx`.
- Add `buyer.orderDetail.status.awaiting_supplier_acceptance` already present — reuse it as the UI label for `pending_confirmation` rows where `accepted_by='buyer'`.

---

### 3. Order/sale creation path (authoritative)

- Authoritative DB path: `submit_initial_bid` → `accept_negotiation` → (supplier) `confirm_negotiation` → `_finalize_negotiation_close` → `orders.status='awaiting_payment'`.
- No new `orders` status. No new RPC. No migration.

---

### 4. Notification fan-out

Triggered after `acceptNegotiation(..., 'buyer')` succeeds, in `src/lib/closeDeal.ts`:

1. **Email** — reuse existing `dealAwaitingConfirmation` template (already in `emailTemplates.ts` and already queued by `CounterOfferActions.acceptNegotiation`). Verified: when buyer accepts, current code already fires this to the supplier primary contact via `sendEmailNotification("dealAwaitingConfirmation", ...)`. ✅ No new template.
2. **In-app** — already created by DB trigger `tg_notify_negotiation_status` when negotiations move to `pending_confirmation` (title "Buyer accepted — confirm the deal"). ✅ No new code.
3. **Mobile push** — **NOT WIRED TODAY** (see §0.b). Plan:
   - **Phase 1 (this PR):** add a no-op `sendPushToCompanyUsers(companyId, payload)` helper in `src/lib/push.ts` that queries a future `device_push_tokens` table; if zero rows or table missing, log and return. This satisfies "degrade gracefully" without blocking shipping.
   - **Phase 2 (follow-up):** install `@capacitor/push-notifications`, create migration for `device_push_tokens (user_id, token, platform)`, capture token on app start in `src/capacitor.ts`, add `supabase/functions/send-push/index.ts` using FCM/APNs (requires secret + your decision on provider — Firebase or OneSignal).

---

### 5. i18n keys to add (all 5 locales)

```
common.closeDeal                      // button label: "Close Deal" / "Fechar negócio" / ...
common.closeDealDialog.title
common.closeDealDialog.body
common.closeDealDialog.confirm
common.closeDealDialog.cancel
```

(EN/PT/ES/FR/ZH exact strings as supplied in the brief.)

---

### 6. DB migrations

- **Phase 1: none.** The whole flow reuses `submit_initial_bid`, `accept_negotiation`, `confirm_negotiation`, `_finalize_negotiation_close`, and existing triggers.
- **Phase 2 (push):** new table `device_push_tokens` + grants/RLS, only if/when we implement real push.

---

### 7. Risks & ambiguities

1. **"Reuse existing Accept Order / Reject Order Sale Detail flow"** — doesn't exist in the repo. Plan assumes Option A (auto-bid + buyer-accept → supplier-confirm). Confirm or we switch to Option B (bigger).
2. **`awaiting_supplier_acceptance` status** — exists only as a UI string, not in DB. We will surface it as the buyer-side label for `negotiations.status='pending_confirmation' AND accepted_by='buyer'`. The order itself, once created, goes to `awaiting_payment` as today.
3. **Supplier countering after buyer "Close Deal"** — currently the `pending_confirmation` status UI shows only Confirm/Reject. Allowing Counter while rounds remain (round < 4) means relaxing that gate in `SupplierNegotiationDetail.tsx` and likely calling `submit_negotiation_round` to reopen the negotiation. The RPC `submit_negotiation_round` today only accepts statuses `awaiting_supplier` or `pending_buyer_review` — countering from `pending_confirmation` will need either (a) a small RPC tweak to accept that status (small migration) or (b) a "decline & counter" RPC. Flagging — needs your call.
4. **Push notifications** — completely missing infra. Plan ships Phase 1 stub and lists Phase 2 work.
5. **Close Deal from Offer when offer is already `negotiating` with another buyer** — current OfferDetail shows a warning banner. Decide if Close Deal is allowed there (treat as parallel negotiation) or blocked.
6. **Locales** — repo has 4 active locales (en/es/pt/zh) and `fr.json`. Brief lists 5 (incl. FR). Confirmed `fr.json` exists, will be updated.
