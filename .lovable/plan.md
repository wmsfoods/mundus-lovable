# Plan — Public `/home` showcase + guided lead-capture

## A. OFFERS — current state and proposed public path

**No public RPC exists.** Closest existing function is `increment_offer_views`. All offer reads go through authenticated `supabase.from("offers").select(...)` (see `src/hooks/useOffers.ts`, `useOffer.ts`, etc.) gated by RLS using `user_buyer_scope_ids()` / `user_supplier_scope_ids()`. There is nothing analogous to WMS `get_public_deals`.

**Supplier-identifying columns on `offers`:** `supplier_id`, `supplier_name`, `supplier_rating`, `office_id`, `plant_id`, `plant_numbers`, `exw_pickup_location`. No `brand` column on `offers` or `companies` today (only `plant_numbers`).

**Card payload that must stay visible** (mirrors `useOffers.ts`): offer_number, origin_country, origin_port (string only, not id), shipment_month/year, payment_terms, container_size, total_fcl, remaining FCL, is_halal/is_kosher, allowed incoterms, markets (destination countries), items array (cut name via `customer_products → standard_products → product_categories`, amount, price, condition).

**To strip in anonymous mode:** `supplier_id`, `supplier_name`, `supplier_rating`, `office_id`, `plant_id`, `plant_numbers`, `exw_pickup_location`, supplier-side `request_id`, and (when introduced) `brand`. We should also avoid leaking `id` until reveal — return a public-safe `public_id` (UUID is fine to expose since the only thing it unlocks post-signup is the real detail page; OK to use raw `id`).

**Proposed approach:** new SECURITY DEFINER RPC `public.get_public_offers()` (and `get_public_offer(p_id uuid)` for detail later if needed) returning a JSON-shaped row set with ONLY the safe columns. Granted to `anon, authenticated`. RLS stays as-is on `offers`; the RPC bypasses RLS by definition. This guarantees masking server-side — nothing supplier-identifying ever crosses the wire.

## B. ROUTING / AUTH

Router lives in `src/App.tsx`. `RequireAuth` guards `/buyer`, `/supplier`, `/admin`, `/dashboard`. `/` goes to `RoleRedirect` which currently does `Navigate to="/login"` for anonymous users. Public routes (no guard) already exist: `/login`, `/signup`, `/respond/:token`, `/shipping-instructions/...`.

**Slot the new public route at `/home`** alongside `/login` (no `RequireAuth`). Behavior:
- Anonymous → render new `PublicHome` page with masked offers + Login button top-right.
- Logged in → either render the same page (with unmasked names) or `<Navigate to="/" replace />` to let `RoleRedirect` send them home. **Decision: render PublicHome unchanged but reveal supplier names + make cards link to real offer pages** (`/buyer/offers/:id` or `/supplier/...` per role).

Also change `RoleRedirect`: for `!user`, redirect to `/home` (instead of `/login`) so anonymous traffic hitting `/` lands on the showcase. Login link stays in the page header.

A separate **`PublicLayout`** (very thin: header with logo + lang switcher + Login button, no buyer/supplier shells) lives at `src/layouts/PublicLayout.tsx`.

## C. PROSPECTS

Mundus already has a full CRM: `crm_companies` and `crm_contacts`. **Reuse, don't invent.** Inbound lead from `/home`:
- Upsert a `crm_companies` row (by domain or company name) with `source='public_home'`, `company_type='prospect'`, `stage='cold'`, `lead_type` ∈ `buyer|supplier|buyer_supplier` (new value derived from the chat).
- Upsert `crm_contacts` row keyed on lowercased `email`, `source='public_home'`, populate `full_name`, `phone`, `country`, `preferred_language`, `products_of_interest` (the protein choice), `lead_source='public_home_chat'`.
- "Already a contact" check = `select id, company_id from crm_contacts where lower(email) = $1`.

No new prospects table needed.

## D. MAX widget port

WMS RPCs **do NOT exist in Mundus**. Confirmed missing: `chat_lookup_contact`, `chat_create_contact`, `chat_log_session`, `get_public_deals`, edge fn `notify-chat-lead`.

**New things to build in Mundus:**

DB / migration (one migration):
1. `public.get_public_offers()` — SECURITY DEFINER, returns masked rows (see A).
2. `public.public_lookup_contact(p_email text)` — SECURITY DEFINER, returns `{ found bool, has_mundus_account bool, contact_id uuid, company_id uuid }`. Granted to `anon`.
3. `public.public_capture_lead(p_payload jsonb)` — SECURITY DEFINER, validates email, upserts `crm_companies` + `crm_contacts` as in C, writes a row to a new lightweight `public_lead_sessions` table (id, email, payload jsonb, created_at, ip via `request.headers`, user_agent) for audit/anti-spam, returns `{ contact_id, company_id }`. Granted to `anon`. Includes basic rate-limit guard (count of rows for same email in last 10 min).
4. `public_lead_sessions` table — new, with proper GRANTs (anon INSERT only via the RPC, service_role ALL, no direct anon read). RLS enabled, no anon policies (RPC is SECURITY DEFINER).
5. Add column `crm_contacts.mundus_rep text` (nullable, freeform enum value for now). Plan migration path: later replace with `mundus_rep_user_id uuid references auth.users` and backfill by name match. Document the eligibility rule **in app code**, not as a CHECK, to keep DB flexible:
   - Buyer flow eligible: Fernando, Gustavo, Debora, Reginaldo, Tomas (5 names)
   - Supplier flow eligible: all 6 (Monica included)

Edge function: **reuse `send-email`**. We already have `emailTemplates` + `email_queue` + `enqueue_email` RPC + `send-email` dispatcher.
- Add a new email template `publicLeadCaptured` in `src/lib/emailTemplates.ts` (sent to admins `fn@mundustrade.com`, with full payload + chosen rep).
- Call it from inside `public_capture_lead` RPC? No — RPC can't easily render HTML. Instead the front-end calls `supabase.functions.invoke("send-email", { body: { email_id } })` after enqueuing via a thin new edge function OR via a new SECURITY DEFINER RPC `enqueue_public_lead_email(p_to, p_vars)`. **Decision: new tiny edge function `public-lead-notify`** (verify_jwt = false, public; takes payload, validates with Zod, enqueues via service role + dispatches). This keeps the public capture API anonymous-friendly and uses the existing email pipeline.

Front-end:
- `src/components/public/MaxChatWidget.tsx` — guided state machine (NOT free chat). Steps: greet → ask email → on submit call `public_lookup_contact` → branch:
  - if `has_mundus_account` → "Welcome back, login" CTA (deep-link to `/login?email=...&next=/buyer/offers/:id` when triggered from a Reveal action).
  - if `found && !has_mundus_account` → "We already know you, a Mundus rep is in touch" + offer rep selector pre-filled.
  - if `!found` → collect name → company → phone → country → protein → mundus_rep (filtered list per buyer/supplier intent) → submit. Always state the next step in every bubble (emotional-journey guardrail).
- Final bubble = explicit "A Mundus rep (X) will reach out within 1 business day" + close button. No silent dead-ends.
- Adapted visually from WMS MAX; copy is new. Headless logic in `src/lib/publicLeadFlow.ts`.

## E. mundus_rep storage

Per D-5: `crm_contacts.mundus_rep text` (free-string for now, validated app-side against a TS constant in `src/lib/mundusReps.ts`):

```ts
export const MUNDUS_REPS = [
  { name: "Fernando Nascimento", eligibility: "both" },
  { name: "Gustavo Agostinho",   eligibility: "both" },
  { name: "Monica Barro",        eligibility: "supplier" },
  { name: "Debora Pereira",      eligibility: "both" },
  { name: "Reginaldo Ferri",     eligibility: "both" },
  { name: "Tomas Moschen",       eligibility: "both" },
];
```

When real user accounts exist, add `mundus_rep_user_id uuid` and migrate by name match in a follow-up migration, then drop the text column.

## F. i18n

Confirmed 5 locales: `src/i18n/locales/{en,es,fr,pt,zh}.json`. Add namespaces:
- `public.home.*` — hero, sectionTitle, login, signup, reveal, anonymousLabel.
- `public.chat.*` — every step's bubble copy + button labels (always include the "next step" phrase).
- `public.lead.success.*` — final confirmation copy naming the chosen rep.

All 5 files updated in lock-step.

## Files / migrations summary

**New migration** (one file):
1. RPC `get_public_offers()`, grants to anon+authenticated.
2. RPC `public_lookup_contact(p_email)`, grants to anon.
3. RPC `public_capture_lead(p_payload jsonb)`, grants to anon.
4. Table `public_lead_sessions` + grants + RLS (deny-all policies, only RPC writes).
5. Column `crm_contacts.mundus_rep text`.

**New edge function:** `supabase/functions/public-lead-notify/index.ts` (+ `supabase/config.toml` entry `verify_jwt = false`).

**New front-end files:**
- `src/pages/public/PublicHome.tsx`
- `src/layouts/PublicLayout.tsx`
- `src/components/public/PublicOfferCard.tsx` (variant that masks brand/supplier; reveal CTA opens chat)
- `src/components/public/MaxChatWidget.tsx`
- `src/lib/publicLeadFlow.ts` (state machine)
- `src/lib/mundusReps.ts`
- `src/hooks/usePublicOffers.ts` (calls the new RPC; no auth assumed)

**Edited files:**
- `src/App.tsx` — add `/home` public route + layout.
- `src/components/RoleRedirect.tsx` — anonymous fallback to `/home`.
- `src/lib/emailTemplates.ts` — add `publicLeadCaptured` template + subject.
- `src/i18n/locales/{en,es,fr,pt,zh}.json` — new namespaces.
- `public/_redirects` — ensure `/home` SPA fallback (already covered by `/* /index.html 200`, verify).

## Emotional-journey guardrail reflected in the plan

- The guided chat never leaves the user hanging: every state has a visible "next step" line and either a primary action button or a final closing message. No free-text bubble can result in silence.
- Final post-capture screen names the assigned `mundus_rep` and sets a concrete timeframe ("within 1 business day"), turning the standard handoff dip into a confidence beat.
- The public showcase itself functions as the "proof before signup" aha early in the funnel — prices, cuts, destinations all visible without an account.
- Not addressed here (intentional): phase 6 matching silence + phase 9 logistics TBI dips remain in the authenticated app and are out of scope.

## Risks / ambiguities

1. **Brand column doesn't exist yet.** The RPC should not reference it; we'll add masking later when it lands. Today, the only supplier identifier we strip is `supplier_name`/`supplier_id`/`plant_*`/`office_id`.
2. **Detail page after reveal:** anonymous users tapping "Reveal" go through chat → after capture we recommend showing a "We'll be in touch — meanwhile sign up to see supplier" CTA rather than auto-revealing the supplier name to a brand-new lead. (Confirm before build.)
3. **Logged-in deep-links:** the public card needs the offer id to route to `/buyer/offers/:id`. Returning the raw UUID from the public RPC is acceptable (it's already used in `/respond/:token` flow). Confirm no objection.
4. **Anti-abuse:** `get_public_offers` is unauthenticated and could be scraped. Mitigations in the RPC: cap to ~200 most-recent active rows, no contact info, no port_id/office_id. The chat capture is rate-limited per email + per IP (10/min). Stronger captcha is a follow-up.
5. **`/dashboard` legacy:** RoleRedirect falls back to `/dashboard` for users with no buyer/supplier role; unchanged.
6. **i18n short string set vs. long marketing copy:** we'll keep the public page copy in i18n files. If marketing wants frequent edits, consider moving to a CMS later.
7. **MAX widget reuse:** WMS code is in a separate project; we will reimplement the state machine in Mundus rather than try to share code. The WMS visual style can be ported as a Tailwind variant.
8. **`supplier_name` is NOT NULL on offers** — fine, we just don't return it in the RPC; no schema change required.
