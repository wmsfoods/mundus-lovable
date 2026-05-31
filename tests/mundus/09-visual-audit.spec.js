import { test } from '@playwright/test';
import { loginAsSupplier, snap } from '../helpers/auth.js';

const SUPPLIER_ROUTES = [
  { path: '/home', label: 'home' },
  { path: '/supplier/customers', label: 'customers' },
  { path: '/supplier/offer-requests', label: 'offer-requests' },
  { path: '/supplier/offers', label: 'offers' },
  { path: '/supplier/sales', label: 'sales' },
  { path: '/supplier/negotiations', label: 'negotiations' },
  { path: '/supplier/users', label: 'users' },
  { path: '/supplier/insights/price-benchmark', label: 'price-benchmark' },
  { path: '/supplier/insights/analytics', label: 'analytics' },
  { path: '/supplier/insights/cut-comparison', label: 'cut-comparison' },
];

const BUYER_ROUTES = [
  { path: '/buyer/home', label: 'buyer-home' },
  { path: '/buyer/offers', label: 'buyer-offers' },
  { path: '/buyer/offer-requests', label: 'buyer-offer-requests' },
  { path: '/buyer/negotiations', label: 'buyer-negotiations' },
  { path: '/buyer/orders', label: 'buyer-orders' },
  { path: '/buyer/users', label: 'buyer-users' },
  { path: '/buyer/procurement-intelligence', label: 'buyer-procurement' },
];

const ADMIN_ROUTES = [
  { path: '/admin/dashboard', label: 'admin-dashboard' },
  { path: '/admin/users', label: 'admin-users' },
  { path: '/admin/companies', label: 'admin-companies' },
  { path: '/admin/offers', label: 'admin-offers' },
  { path: '/admin/negotiations', label: 'admin-negotiations' },
  { path: '/admin/sales', label: 'admin-sales' },
];

async function auditRoutes(page, routes, prefix) {
  for (const route of routes) {
    try {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await snap(page, `${prefix}-${route.label}`);
      console.log(`✅ ${route.path} → ${page.url()}`);
    } catch (e) {
      console.log(`⚠️ ${route.path} failed: ${e.message}`);
    }
  }
}

test('Visual audit — supplier pages', async ({ page }) => {
  if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
  await loginAsSupplier(page);
  await auditRoutes(page, SUPPLIER_ROUTES, '09');
});

test('Visual audit — buyer pages', async ({ page }) => {
  if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
  await loginAsSupplier(page);
  await auditRoutes(page, BUYER_ROUTES, '09');
});

test('Visual audit — admin pages', async ({ page }) => {
  if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
  await loginAsSupplier(page);
  await auditRoutes(page, ADMIN_ROUTES, '09');
});
