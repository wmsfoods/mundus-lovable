
# Mundus Trade — Phase 1 Security Audit (Read-Only)

Sources: Supabase DB linter (245 findings), Lovable security scanner (agent + supabase + supabase_lov), direct queries on `pg_policy`, `pg_proc`, `storage.buckets`, `storage.objects` policies, repo grep over `src/` and `supabase/functions/`, and `supabase/config.toml`.

**No code or DB changes have been made — this is analysis only.**

---

## CRITICAL (data exposure / auth bypass / leaked credentials)

### C-1. Hardcoded Anthropic API key in `verify-document`
- File: `supabase/functions/verify-document/index.ts` (~line 53). Real `sk-ant-api03-...` used as `||` fallback.
- Function is also unauthenticated (verify_jwt=false). Anyone can drain credits or grep the key from logs / repo.
- Fix: rotate the key in Anthropic console, remove the literal fallback, require `Deno.env.get` + 500 if missing, store in Supabase secrets.

### C-2. Hardcoded Resend API key in 3 edge functions
- `verify-email/index.ts`, `signup-notifications/index.ts`, `negotiation-notifications/index.ts` (all share `re_APWMMN9H_...` as fallback).
- Fix: rotate the Resend key, remove fallbacks, fail closed if env var missing.

### C-3. `offers` table — blanket SELECT exposes drafts and pricing internals
- Policy `offers_select_all USING (true)` allows every authenticated user to read every offer row, including `status='draft'`, `mundus_fee_rate`, `net_prices`, `minimum_price`, `specific_buyer_company_ids`, `negotiation_dial`.
- Fix: scope SELECT to (a) owner supplier + family, (b) buyers only for `status in ('active','published')` and only non-sensitive columns (move pricing-internal columns to a separate row or a view that filters them, or split into `offers_public_view` + restricted columns).

### C-4. `offer_items` — supplier floor prices visible to all auth users
- Policy `offer_items_select_all USING (true)` exposes `minimum_price` (and floor data via `offer_item_floors`).
- Fix: restrict SELECT of pricing-sensitive columns to supplier owner + Mundus admin. Buyers should read only public columns through a column-filtered policy or a view.

### C-5. Stripe billing portal — no company membership check
- `supabase/functions/stripe-create-portal/index.ts` validates JWT but accepts caller-supplied `company_id` and opens that company's billing portal.
- Any authenticated user can manage **another company's** subscription, payment methods, invoices.
- Fix: mirror `stripe-create-checkout`'s membership check (`company_family_ids` + `company_users` lookup, plus admin bypass).

### C-6. 12+ Edge Functions are publicly callable (verify_jwt = false) with no in-code auth
From `supabase/config.toml` plus default-false for unlisted functions, the following accept anonymous POSTs:
- `negotiation-notifications`, `signup-notifications`, `nudge-stale-negotiations`, `send-email`, `verify-document`, `verify-email`, `prospect-search`, `prospect-enrich`, `scan-business-card`, `generate-meeting-prep`, `shipping-instructions-send-link`, `shipping-instructions-notify-approved`, `extract-bl`, `prospect-phone-webhook`, `email-track`, `resend-webhook`, `mundus-admin-mcp`, `auth-email-hook`, `public-lead-notify`, `send-push`, `send-password-reset`, `preview-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`.
- Risks: AI credit draining (Anthropic/Gemini/Lovable AI gateway), email spam, queue flushing, CRM data enumeration, notification forgery.
- Fix (per function):
  - Webhooks (`resend-webhook`, `prospect-phone-webhook`, `stripe-webhook`, `auth-email-hook`): verify provider signature (Svix for Resend, Stripe signing secret, shared secret header for Apollo).
  - Admin-only (`nudge-stale-negotiations`, `send-email`, `mundus-admin-mcp`, `preview-transactional-email`): require Bearer + `is_mundus_admin()`.
  - User-facing (`verify-document`, `prospect-*`, `scan-business-card`, `generate-meeting-prep`, `extract-bl`, `negotiation-notifications`, `signup-notifications`, `shipping-instructions-*`): set `verify_jwt = true` and use `getClaims()` / `requireUser` (helper already exists at `supabase/functions/_shared/auth.ts`).
  - Truly public flows (`public-lead-notify`, `handle-email-unsubscribe`, `handle-email-suppression`, `email-track`): keep open but add HMAC token / rate limit.

---

## HIGH (RLS gaps, missing scoping)

### H-1. `_agrostats_probe_results` — RLS disabled in public schema
- Linter `SUPA_rls_disabled_in_public` (error). Exposed via PostgREST to anon role.
- Fix: enable RLS, deny-all policy, restrict to `service_role` (or drop the table if unused).

### H-2. `offer_likes` and `offer_favorites` — competitive intelligence leak
- Both have `USING (true)` SELECT, exposing which company likes/favorites which offer platform-wide.
- Fix: scope SELECT to `company_id = current_user_company_id()` (plus admin).

### H-3. Open redirect in `email-track`
- `?action=click&url=...` redirects without domain allow-list. Enables phishing under the `mundustrade.com` brand.
- Fix: allow-list host, or store target URL in `email_sends` and redirect by ID.

### H-4. Email enumeration & unauthenticated OTP send in `verify-email`
- `action=check` returns `{exists:true|false}` for any email; `action=send` lets anyone send OTPs to any address.
- OTP also logged to console (`console.log('[VERIFY] Code …')`) and returned in body as `_dev_code` when key missing.
- Fix: drop `check` or gate to signup flow with CAPTCHA + rate limit; return constant response; remove OTP from logs and from JSON response.

### H-5. `prospect-phone-webhook` accepts arbitrary upserts
- Anyone can POST to overwrite `prospect_phone_reveals` by guessing/learning Apollo IDs.
- Fix: shared-secret header (`APOLLO_WEBHOOK_SECRET`) or IP allow-list.

### H-6. `resend-webhook` accepts forged events
- Code explicitly skips signature verification. Forged events can corrupt `email_queue`, `email_domain_health`.
- Fix: enable signing in Resend, verify Svix headers with stored `RESEND_WEBHOOK_SECRET`.

### H-7. Public bucket `avatars` allows global listing
- `Avatars public read USING (bucket_id='avatars')` permits enumerating all uploaded avatar paths (linter `SUPA_public_bucket_allows_listing`).
- Fix: change to read-by-known-path via signed URLs, or scope SELECT to single-object metadata only.

### H-8. Public bucket `cut-images`
- Marked public with broad read; verify it never contains supplier/buyer-private cuts.
- Fix: confirm catalog-only content, otherwise migrate to private + signed URLs.

### H-9. Sensitive private buckets — confirm policies
Buckets: `bl-documents`, `company-documents`, `company-files`, `mw-media`, `offer-item-media`, `request-attachments`, `via-mundus-attachments`. Spot-checked policies are scoped to deal parties via `current_user_company_id()` and `is_mundus_admin()`, which is correct. Action: extend the same review pattern to every bucket policy (`company-files`, `mw-media`, `offer-item-media`, `via-mundus-attachments` not fully reviewed in this pass).

### H-10. XSS via unsanitized email body
- `src/components/supplier/OutreachModal.tsx` line ~155 uses `dangerouslySetInnerHTML={{ __html: body }}` on a user-edited textarea. If body is persisted and re-rendered elsewhere, becomes stored XSS.
- Fix: sanitize via DOMPurify before render and before persistence.

---

## MEDIUM (best practice violations)

### M-1. Many SECURITY DEFINER functions executable by `authenticated` / `anon`
- Linter flags 238 instances of `SUPA_authenticated_security_definer_function_executable` and at least 1 of `SUPA_anon_security_definer_function_executable`.
- All `public.*` SECURITY DEFINER functions inherit default `EXECUTE` to `public`. Many are meant only for internal use (`_finalize_negotiation_close`, `_neg_parties`, `_notify_company`, `admin_*`, `agrostats_*`, `claim_*`, `cleanup_*`).
- Fix: `REVOKE EXECUTE ... FROM public, anon, authenticated` and `GRANT EXECUTE ... TO authenticated` (or `service_role`) only for the explicit RPCs the client must call. Maintain an allow-list.

### M-2. Some SECURITY DEFINER functions still missing `SET search_path`
- Confirmed by query: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq` have no search_path config. (Most others already include `search_path=public`.)
- Fix: `ALTER FUNCTION ... SET search_path = public, pg_temp;` for each.

### M-3. `app_settings` policy is `USING (false) WITH CHECK (false)`
- Correctly locks out clients, but PostgREST still exposes the route. Confirm `service_role`-only is intended; otherwise revoke API grants entirely.

### M-4. `_bkp_*` backup tables retained in public schema
- `_bkp_company_users_p1`, `_bkp_team_invitations_p1`, `_bkp_team_invitations_predrop` have RLS on but flagged "RLS Enabled No Policy" (no rows reachable, but still exposed via API as 0-row results).
- Fix: move to a `backup` schema not exposed to PostgREST, or drop after retention window.

### M-5. CORS uses `*` on most edge functions
- All reviewed functions return `Access-Control-Allow-Origin: *`. Acceptable for truly public endpoints, but for authenticated/private endpoints restrict to the app origins (`https://app.mundustrade.us`, `https://mundustrade.com`).

### M-6. `verify_jwt = true` is set for only 2 functions (`process-email-queue`, `send-transactional-email`)
- Combined with C-6: most functions are public by configuration. Audit `supabase/config.toml` and set `verify_jwt = true` by default for any function that isn't an explicit webhook/public endpoint.

### M-7. Auth defaults
- Password HIBP check status not verified in code. Recommend `password_hibp_enabled: true`.
- Confirm email confirmation is required (no auto-confirm). Disable anonymous sign-ups (`external_anonymous_users_enabled: false`).
- Linter often flags "Auth OTP Long Expiry" and "Leaked Password Protection Disabled" on default projects — verify in Auth settings.

### M-8. `RLS Enabled No Policy` informational findings (6 tables)
- Tables with RLS but no SELECT/INSERT policy (queries return 0 rows, but they appear in PostgREST). Identify the 6 and either add explicit deny policies, drop the tables, or move out of `public`.

---

## LOW (linter informational / housekeeping)

- L-1. `VITE_GOOGLE_PLACES_API_KEY` is by design client-side, but currently has no HTTP referrer restriction in Google Cloud. Add referrer + Places-API-only restriction, or proxy via edge function.
- L-2. `src/components/whats/*` and `src/hooks/mw/useMwInstancesCrud.ts` send `evolution_api_key` in `fetch` headers from the browser — confirm those keys are per-tenant and stored encrypted server-side, not embedded at build time.
- L-3. `Function Search Path Mutable` — 100+ instances flagged. Already mitigated for most via `SET search_path=public`, see M-2 for the remaining ones.
- L-4. `RoleRedirect`/`RequireAdmin` components — confirm every `/admin/*` route uses `RequireAdmin` (not just `RequireAuth`). Spot check shows `useIsMundusAdmin` calls `is_mundus_admin()` RPC correctly.
- L-5. `.env` is checked into repo with `VITE_SUPABASE_*` (publishable) and the Google key. Publishable keys are fine, but Google key should be replaced after restrictions applied.

---

## Quick stats

- Public tables: 130; RLS enabled on 129, disabled on 1 (`_agrostats_probe_results`).
- RLS policies: 177 reviewed; 4 confirmed `USING (true)` on sensitive tables (`offers`, `offer_items`, `offer_likes`, `offer_favorites`).
- Edge functions: 45 total; ~24 explicitly `verify_jwt=false`, ~21 default (also unverified unless overridden); only 2 set `verify_jwt=true`.
- Storage buckets: 9 total; 2 public (`avatars`, `cut-images`), 7 private.
- SECURITY DEFINER functions in public: ~100+; 4 confirmed missing `search_path` (M-2); 1 with `false` search_path concerns is `admin_reset_playground` which has `pg_temp` already.
- Hardcoded secrets in repo: 2 keys (Anthropic, Resend) — both must be rotated.

---

## Recommended remediation order

1. Rotate Anthropic + Resend keys (C-1, C-2) immediately.
2. Patch RLS on `offers`, `offer_items`, `offer_likes`, `offer_favorites` (C-3, C-4, H-2).
3. Add membership check to `stripe-create-portal` (C-5).
4. Lock down public edge functions (C-6) — set `verify_jwt=true`, add `requireUser`/`requireAdmin`, verify webhook signatures.
5. Fix open redirect, email enumeration, OTP logging (H-3, H-4).
6. Enable RLS on `_agrostats_probe_results`, drop/move `_bkp_*` tables (H-1, M-4).
7. Tighten `avatars` bucket listing; audit remaining private buckets (H-7, H-9).
8. Revoke EXECUTE from public on SECURITY DEFINER (M-1) and add search_path to remaining 4 functions (M-2).
9. Sanitize HTML rendering (H-10).
10. Restrict Google Places key in GCP console (L-1).

No code/DB changes performed. Approve this plan to switch to build mode and start with steps 1–3.
