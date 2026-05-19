# Premium Insights upsell — plan

Add a right-side panel that explains the upcoming Mundus Insights add-on, triggered from the PRO badges in the supplier sidebar and from a new CTA in the PreviewBanner. Content is tailored per feature (Price benchmark vs Supplier analytics).

## Surface

Right-side slide-in panel, 440px wide on desktop, full-width bottom sheet on mobile (≤640px). Backdrop dims the page but the panel feels lighter than a modal — matches the "premium dashboard" vibe of the Insights pages. ESC + backdrop click + X close it. Body scroll locked while open.

```text
┌──────────────────────────────┬──────────────┐
│                              │  [×]         │
│   page stays visible         │  PRO  Insights│
│   behind a 40% backdrop      │  ──────────  │
│                              │  Hero copy   │
│                              │  Feature list│
│                              │  Pricing hint│
│                              │  ──────────  │
│                              │  [Early acc] │
│                              │  [Contact sa]│
└──────────────────────────────┴──────────────┘
```

## Triggers

1. **PRO badge in sidebar** — clicking the chip on "Price benchmark" or "Supplier analytics" nav items opens the panel pre-loaded with that feature's content (does NOT navigate).
2. **CTA in PreviewBanner** — add a "Learn more" button next to the dismiss X on both insight pages. Opens the panel for the current page's feature.

The panel knows which feature to show via a `feature: "price-benchmark" | "analytics"` prop.

## Content (feature-specific)

**Price benchmark panel**
- Eyebrow: "PRO · Coming soon"
- Title: "Know exactly where your offer stands"
- 4 bullet feature list with icons (TrendingDown, Eye, Bell, Sparkles): live market distribution, anonymized competitor ranking, price-drop alerts, AI-suggested target price.
- Mini "What you get" card listing: weekly market report PDF, Slack/email alerts, historical 12mo trend.

**Supplier analytics panel**
- Eyebrow: "PRO · Coming soon"
- Title: "Turn every offer into a learning loop"
- 4 bullet feature list (BarChart, Users, Globe, Timer): full conversion funnel, buyer cohort retention, geographic demand heatmap, response-time SLA tracking.
- Mini "What you get" card: monthly performance review, CSV exports, custom date ranges, buyer-level drilldown.

Shared footer block (both): "Launching Q3 2026 · Pricing announced at launch" + two CTAs.

## CTAs

- Primary: **Request early access** → fires `toast.success("We'll be in touch shortly")` (sonner). Closes panel.
- Secondary: **Contact sales** → `mailto:sales@mundus.com?subject=Mundus Insights – {feature}&body=...`. Opens in new tab.

## Technical details

**New files**
- `src/components/supplier/InsightsUpsellPanel.tsx` — controlled panel component, accepts `open`, `onClose`, `feature`. Renders via `createPortal` to `document.body`. Animates in with CSS transform + opacity (200ms).
- `src/contexts/InsightsUpsellContext.tsx` — tiny context exposing `openUpsell(feature)` and panel state. Provider mounted inside `SupplierShell` so both sidebar and Insights pages can trigger it without prop drilling.

**Edited files**
- `src/components/mundus/ProBadge.tsx` — when given an `onClick` prop, render as a `<button>` instead of `<span>`; stays visually identical.
- `src/components/mundus/Sidebar.tsx` / `MobileDrawer.tsx` — accept an optional `onBadgeClick(item)` callback on nav items; stopPropagation so it doesn't navigate.
- `src/layouts/SupplierShell.tsx` — wrap children in `InsightsUpsellProvider`, mount `<InsightsUpsellPanel />` once, wire sidebar `onBadgeClick` to `openUpsell(item.feature)`.
- `src/components/mundus/PreviewBanner.tsx` — accept `feature` prop, add "Learn more" button that calls `openUpsell(feature)`.
- `src/pages/supplier/PriceBenchmark.tsx` / `SupplierAnalytics.tsx` — pass `feature` to `<PreviewBanner />`.
- `src/styles/mundus-insights.css` — `.ins-upsell-*` styles (backdrop, panel, header, feature list, CTA row, mobile bottom-sheet variant).
- `src/i18n/locales/{en,pt,es}.json` — add `supplier.insights.upsell.{priceBenchmark,analytics}` blocks with all copy + shared keys (`earlyAccess`, `contactSales`, `launching`, `learnMore`).

**Styling**
- Panel uses existing tokens (`--g100`–`--g900`, brand rose `#B64769` for the PRO chip in the panel header and primary CTA only). 0.5px borders, sentence case, two weights (400/500), monospace only for pricing hints — matches Anthropic console rules.
- Mobile (<640px): panel becomes a bottom sheet, max-height 85vh, respects safe-area bottom.

**No backend changes.** Pure presentation — toast feedback + mailto.

## Out of scope

- Real lead capture / DB persistence
- Editing PRO badge appearance
- Touching the Insights page content beyond passing one prop
- Any admin or buyer pages
