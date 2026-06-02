## Update Max chat widget copy and flows

Refine the conversational copy and routing of `MaxChatWidget.tsx` (opened when clicking "Reveal supplier") to match the new script, and personalize when the contact is already known.

### New copy (EN + PT/ZH translations)

**Greeting (always shown)**
- "Hello!"
- "I will help you connect with the Mundus platform."
- "Let's see if you're already registered — it takes less than a minute."
- "Share your work email so I can check if we already know you."

**After email lookup:**

1. **Not found in records** → show:
   - "Looks like we haven't found you in our records."
   - "Please fill in the next fields and someone will contact you ASAP."
   - Plus an alternative CTA button: **"Or sign up directly →"** linking to `/signup?email=...`
   - Then continue the existing name → company → phone → country → protein → leadType flow.

2. **Already a Mundus account** (has_mundus_account) → personalized:
   - "Hello {firstName}!" (use name returned by `lookupContact`; fallback to "Hello!" if missing)
   - "Welcome back — you already have a Mundus account."
   - "Please log in to our platform."
   - "If you're a supplier, you won't be able to see other suppliers' offers."
   - CTA button: **"Log in →"** linking to `/login?email=...`

3. **Known contact, no account yet** (existingContact) → keep current "we already know you, a rep will reach out" message but reword slightly to match new tone, and personalize with first name when available.

### Technical details

- File: `src/components/public/MaxChatWidget.tsx`.
- `lookupContact` already returns contact info; confirm it returns a `name`/`first_name` field. If not, extend the response usage to read whatever name field exists (check `src/lib/publicLeadFlow.ts`) and store it in a `contactName` state to personalize bubbles. If no name field exists, plan a small addition to `publicLeadFlow.ts` to surface it from the lookup response.
- Replace existing initial Bubbles (`greet`, `nextEmail`) with the 4 new lines.
- Update `existingAccount` branch: personalized greeting + 3 bubbles + login link (already present, just adjust label/copy).
- Update `name` step entry to first show the two "haven't found you" bubbles, plus an inline secondary action linking to `/signup?email=...` before the name input.
- Update i18n keys in `src/i18n/locales/en.json` (and `zh.json`, `pt` if present) under `public.chat.*`. Add: `greetHello`, `greetHelp`, `greetCheck`, `greetEmailAsk`, `notFoundTitle`, `notFoundFill`, `notFoundSignupLink`, `welcomeBackNamed`, `welcomeBackBody`, `welcomeBackLogin`, `welcomeBackSupplierNote`.
- Keep existing styles, safe-area handling, and the Start-over / Close controls.
- No backend/schema changes.

### Out of scope
- No changes to the offer card, hero, or onboarding.
- No changes to authentication or lookup logic beyond optionally surfacing the contact name.
