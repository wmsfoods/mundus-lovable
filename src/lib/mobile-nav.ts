import { matchPath } from "react-router-dom";

/**
 * Mobile navigation model.
 *
 * - "tab root" screens keep the slim Topbar + BottomNav.
 * - "stack" screens replace topbar+bottombar with the StackHeader
 *   (back button + title + optional actions).
 *
 * The rule is automatic: any route below a role shell that contains
 * a route param (e.g. `:id`, `:conversationId`) OR ends in `/new`
 * OR matches one of the explicit STACK_PATHS is treated as a stack screen.
 */

/** Patterns that should always be treated as stack screens. */
const STACK_PATHS: string[] = [
  "/buyer/profile",
  "/supplier/profile",
  "/buyer/requests",
  "/buyer/negotiations",
  "/buyer/orders",
  "/buyer/users",
  "/supplier/requests",
  "/supplier/negotiations",
  "/supplier/users",
  "/supplier/company",
  "/supplier/insights/price-benchmark",
  "/supplier/insights/analytics",
];

/** Patterns whose match is a stack screen (uses `:param`). */
const STACK_PATTERNS: string[] = [
  "/buyer/offers/:id",
  "/buyer/orders/:id",
  "/buyer/requests/:id",
  "/buyer/requests/new",
  "/buyer/negotiations/:id",
  "/buyer/chat/:conversationId",
  "/supplier/offers/:id",
  "/supplier/offers/new",
  "/supplier/requests/:id",
  "/supplier/sales/:id",
  "/supplier/negotiations/:id",
];

/**
 * Where to go when the user taps "back" on a stack screen and there is no
 * history entry (deep link, full reload). Maps pattern → fallback tab root.
 */
const BACK_FALLBACK: Array<{ pattern: string; to: string }> = [
  { pattern: "/buyer/offers/:id", to: "/buyer/offers" },
  { pattern: "/buyer/orders/:id", to: "/buyer/orders" },
  { pattern: "/buyer/orders", to: "/buyer" },
  { pattern: "/buyer/requests/:id", to: "/buyer/requests" },
  { pattern: "/buyer/requests/new", to: "/buyer" },
  { pattern: "/buyer/requests", to: "/buyer" },
  { pattern: "/buyer/negotiations/:id", to: "/buyer/negotiations" },
  { pattern: "/buyer/negotiations", to: "/buyer" },
  { pattern: "/buyer/chat/:conversationId", to: "/buyer/chat" },
  { pattern: "/buyer/users", to: "/buyer" },
  { pattern: "/buyer/profile", to: "/buyer" },
  { pattern: "/supplier/offers/:id", to: "/supplier/offers" },
  { pattern: "/supplier/offers/new", to: "/supplier/offers" },
  { pattern: "/supplier/requests/:id", to: "/supplier/requests" },
  { pattern: "/supplier/requests", to: "/supplier" },
  { pattern: "/supplier/sales/:id", to: "/supplier/sales" },
  { pattern: "/supplier/negotiations/:id", to: "/supplier/negotiations" },
  { pattern: "/supplier/negotiations", to: "/supplier" },
  { pattern: "/supplier/users", to: "/supplier" },
  { pattern: "/supplier/company", to: "/supplier" },
  { pattern: "/supplier/profile", to: "/supplier" },
  { pattern: "/supplier/insights/price-benchmark", to: "/supplier" },
  { pattern: "/supplier/insights/analytics", to: "/supplier" },
];

/**
 * Default title (i18n key) per stack route. Pages may override at runtime
 * via `useStackHeader({ title })`.
 */
const STACK_TITLES: Array<{ pattern: string; titleKey: string }> = [
  { pattern: "/buyer/offers/:id", titleKey: "buyer.offers.detail.headerTitle" },
  { pattern: "/buyer/orders/:id", titleKey: "buyer.orders.detail.headerTitle" },
  { pattern: "/buyer/orders", titleKey: "shell.nav.orders" },
  { pattern: "/buyer/requests/:id", titleKey: "buyer.requests.detail.headerTitle" },
  { pattern: "/buyer/requests/new", titleKey: "shell.nav.createRequest" },
  { pattern: "/buyer/requests", titleKey: "shell.nav.requests" },
  { pattern: "/buyer/negotiations/:id", titleKey: "buyer.negotiations.detail.headerTitle" },
  { pattern: "/buyer/negotiations", titleKey: "shell.nav.negotiations" },
  { pattern: "/buyer/chat/:conversationId", titleKey: "shell.nav.chat" },
  { pattern: "/buyer/users", titleKey: "shell.nav.users" },
  { pattern: "/buyer/profile", titleKey: "shell.profile" },
  { pattern: "/supplier/offers/:id", titleKey: "supplier.offers.detail.headerTitle" },
  { pattern: "/supplier/offers/new", titleKey: "shell.nav.createOffer" },
  { pattern: "/supplier/requests/:id", titleKey: "supplier.requests.detail.headerTitle" },
  { pattern: "/supplier/requests", titleKey: "shell.nav.offerRequests" },
  { pattern: "/supplier/sales/:id", titleKey: "supplier.sales.detail.headerTitle" },
  { pattern: "/supplier/negotiations/:id", titleKey: "supplier.negotiations.detail.headerTitle" },
  { pattern: "/supplier/negotiations", titleKey: "shell.nav.negotiations" },
  { pattern: "/supplier/users", titleKey: "shell.nav.users" },
  { pattern: "/supplier/company", titleKey: "shell.nav.myCompany" },
  { pattern: "/supplier/profile", titleKey: "shell.profile" },
  { pattern: "/supplier/insights/price-benchmark", titleKey: "supplier.insights.nav.priceBenchmark" },
  { pattern: "/supplier/insights/analytics", titleKey: "supplier.insights.nav.analytics" },
];

function matchAny(pathname: string, patterns: string[]): boolean {
  return patterns.some((p) => matchPath({ path: p, end: true }, pathname));
}

export function isStackRoute(pathname: string): boolean {
  if (STACK_PATHS.includes(pathname)) return true;
  return matchAny(pathname, STACK_PATTERNS);
}

export function backFallbackFor(pathname: string): string {
  const hit = BACK_FALLBACK.find((r) => matchPath({ path: r.pattern, end: true }, pathname));
  if (hit) return hit.to;
  if (pathname.startsWith("/supplier")) return "/supplier";
  return "/buyer";
}

export function defaultTitleKeyFor(pathname: string): string | null {
  const hit = STACK_TITLES.find((r) => matchPath({ path: r.pattern, end: true }, pathname));
  return hit?.titleKey ?? null;
}