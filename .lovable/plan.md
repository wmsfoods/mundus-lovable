## Goal
Add the same "Learn more" upsell pattern (preview banner + side panel) used on the Supplier Analytics page to the Buyer Procurement Intelligence page.

## Changes

### 1. Extend the upsell system to support a buyer feature
`src/components/supplier/InsightsUpsellPanel.tsx`
- Add `"procurement"` to `UpsellFeature` union.
- Add a `FEATURES.procurement` entry with 4 bullets (e.g. `spend`, `savings`, `suppliers`, `alerts` using icons `Wallet`, `TrendingDown`, `Users`, `Bell`), `perks: 4`, `salesSubject: "Mundus Insights – Procurement intelligence"`.
- Map feature key to i18n root: `procurement` → `buyer.procurement.upsell`.

### 2. Wrap BuyerShell with the provider
`src/layouts/BuyerShell.tsx`
- Import `InsightsUpsellProvider` and wrap the shell render (same pattern as `SupplierShell.tsx`) so `PreviewBanner` works inside buyer pages.

### 3. Drop the banner into the page
`src/pages/buyer/ProcurementIntelligence.tsx`
- Import `PreviewBanner` and render `<PreviewBanner feature="procurement" />` right below the page header (mirroring `SupplierAnalytics.tsx`).

### 4. i18n keys (en/pt/es)
Add `buyer.procurement.upsell.*` with the same shape supplier uses:
```
title, lede,
bullets.{spend,savings,suppliers,alerts}.{title,body},
perks.0..3
```
Reuse existing shared keys (`supplier.insights.upsell.{eyebrow,perksLabel,launching,pricing,earlyAccess,earlyAccessToast,contactSales,salesBody,learnMore}`) and `supplier.insights.previewBanner.{title,body}` so we don't duplicate strings. (Optional: alias under `buyer.procurement.previewBanner` later — not needed for this change.)

## Notes
- No visual/CSS changes — reuses existing `.ins-preview-banner` and `.ins-upsell-*` styles.
- The supplier upsell panel component is being reused for the buyer; name stays as is to avoid churn. If you'd prefer, we can rename it to `InsightsUpsellPanel` under `components/mundus/` in a follow-up.
