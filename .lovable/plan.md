## Goal
Make the **AI Quick-fill** button (header of Create Offer V2) visually stand out, while keeping the existing text ("AI Quick-fill") and the `Sparkles` icon.

## Where
`src/pages/supplier/SupplierCreateOfferV2.tsx` — the `<Button variant="outline">` at line ~1075 wrapping `<Sparkles />` + `tk("quickFill.openButton")`.

## What changes

Replace the `shadcn Button` with a custom `<button>` that uses semantic design tokens (no hardcoded colors) and adds movement + glow on hover. The user's reference snippet is just a style cue — we'll adapt it to our token system (HSL via `--primary`, `--accent`) instead of `bg-gray-900`.

### Visual treatment
- **Background**: subtle gradient using `primary` → `accent` (or a violet/pink mix from existing tokens) so it pops against the page chrome.
- **Text + icon color**: `primary-foreground` (always high-contrast on the gradient).
- **Icon**: keep `Sparkles` (lucide). Add a tiny continuous pulse/twinkle via existing `animate-pulse` on the icon only, so the eye is drawn even at rest.
- **Hover**: slight `-translate-y-0.5`, stronger shadow tinted with `hsl(var(--primary) / 0.35)`, and a brief shine/sheen sweep (CSS-only: an absolutely-positioned `::before` white gradient that translates across on `group-hover`).
- **Active**: `scale-[0.98]` for tactile feedback.
- **Focus-visible**: ring using `--ring`.
- Size stays compact (matches the neighboring "Engine" / unit toggle buttons in the header — `text-xs`, `h-8`, rounded-md).

### Sketch (Tailwind, conceptual)
```text
group relative inline-flex items-center gap-1.5 overflow-hidden
rounded-md px-3 h-8 text-xs font-semibold
text-primary-foreground
bg-gradient-to-r from-primary via-primary to-accent
shadow-md shadow-primary/20
transition-all duration-200
hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/40
active:scale-[0.98]
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
Plus a `<span>` overlay for the sheen, and `<Sparkles className="animate-pulse" />`.

## What we won't do
- Not creating `src/components/ui/button-1.tsx` — the reference is a single-use header button, so inlining keeps the codebase clean. (If you'd rather have a reusable `<AiQuickFillButton />`, say so and I'll extract it.)
- Not touching the modal, i18n keys, or the Engine/unit-toggle siblings.
- No color literals — all via `--primary`, `--accent`, `--primary-foreground`, `--ring` from `index.css`.

## Verify
- Visual: button visibly stands out from neighbors, sparkle pulses, hover lifts + sheen sweeps.
- `npx tsc --noEmit` exit 0.
- Mobile: button still fits in the header row at ≤375px (icon + text, no wrap).
