## Mundus PRO — Stripe subscriptions

Replace the placeholder "Early Access" CTA in `InsightsUpsellPanel` with a real Stripe-backed monthly subscription, scoped per company (HQ covers the whole multi-office family).

### Pricing & gates
- Supplier PRO — **USD 1,000/mo** → unlocks `PriceBenchmark`, `SupplierAnalytics`, `CutComparison`, Market Intelligence
- Buyer PRO — **USD 300/mo** → unlocks `ProcurementIntelligence`, Market Intelligence
- One subscription per HQ company; office users inherit via `company_family_root`

---

### 1. Stripe setup (you do this in Stripe)
- Create two recurring Products/Prices (Supplier PRO $1,000/mo, Buyer PRO $300/mo)
- I'll request these as secrets once code is ready: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SUPPLIER_PRO`, `STRIPE_PRICE_BUYER_PRO`
- Webhook endpoint: `{SUPABASE_URL}/functions/v1/stripe-webhook` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`)

### 2. Database migration
- `company_subscriptions` table (UNIQUE on `company_id`, columns per spec: stripe ids, plan, status, period dates, cancel flags)
- RLS: SELECT for family members + admin; writes only via service role
- `public.company_has_pro(uuid)` — checks the company **or its `company_family_root`** for an active sub
- GRANTs on table + function per project rules

### 3. Edge Functions
- `stripe-create-checkout` — verifies JWT + company membership (family-scoped), creates/reuses Stripe Customer, returns Checkout Session URL (mode `subscription`, metadata `{company_id, plan}`)
- `stripe-create-portal` — opens Stripe Customer Portal for managing/cancelling
- `stripe-webhook` — verifies signature, idempotent upsert into `company_subscriptions` for the 4 events above; always returns 200

### 4. Frontend
- `src/hooks/useCompanySubscription.ts` — returns `{ isPro, status, plan, periodEnd, loading }` with realtime subscription on the row
- `src/components/billing/RequirePro.tsx` — wrapper that shows the upsell panel (or a locked state for Market Intelligence) when `!isPro`
- `InsightsUpsellPanel.tsx`:
  - Replace `handleEarlyAccess` toast with `handleUpgrade` that calls `stripe-create-checkout` and redirects to `session.url`
  - Button label shows real price ("Upgrade to PRO — $1,000/month" or "$300/month")
  - Swap "Launching soon" pill for "Billed monthly · Cancel anytime"
  - Keep Contact Sales link
- Gate the PRO pages (`PriceBenchmark`, `SupplierAnalytics`, `CutComparison`, `ProcurementIntelligence`, Market Intelligence shell) with `RequirePro`
- New routes: `/supplier/subscription-success`, `/buyer/subscription-success` with auto-redirect

### 5. Billing section in Profile/Settings
- Supplier & buyer profile: show plan, next billing date, "Manage Billing" → portal; `past_due` red banner; "Upgrade to PRO" when no sub

### 6. Admin visibility
- `AdminCompanies` list: PRO badge on active companies
- `AdminCompanyDetail`: subscription status, plan, Stripe customer id (read-only), manual status override select (admin-only RPC writing to `company_subscriptions`)

### 7. i18n
- Add all new strings to **en / pt / es / fr / zh** (upgrade CTA, billing labels, success page, locked states, admin status)

### Security & constraints
- Stripe keys live **only** in Supabase Edge Function secrets — never in `.env` or frontend
- Webhook handler is idempotent (`ON CONFLICT DO UPDATE` keyed by `stripe_subscription_id`)
- Family-aware: office users inherit HQ subscription via `company_family_root`
- Mobile-first: upgrade button, billing section, success page all responsive

### Order of execution
1. Migration (`company_subscriptions` + `company_has_pro`)
2. Request Stripe secrets from you
3. Edge functions (checkout, portal, webhook)
4. Hook + `RequirePro` + upsell panel rewire
5. Routes, success page, billing section, admin badge
6. i18n across 5 locales

### Not in scope
- Annual plans, proration, multi-seat pricing, tax handling (Stripe defaults), invoicing other than what Stripe sends automatically
