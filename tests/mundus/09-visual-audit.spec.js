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
];

const ADMIN_ROUTES = [
  { path: '/admin/dashboard', label: 'admin-dashboard' },
  { path: '/admin/users', label: 'admin-users' },
  { path: '/admin/companies', label: 'admin-companies' },
  { path: '/admin/offers', label: 'admin-offers' },
  { path: '/admin/negotiations', label: 'admin-negotiations' },
  { path: '/admin/sales', label: 'admin-sales' },
];

test('Visual audit — supplier pages', async ({ page }) => {
  if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) {
    test.skip();
  }
  await loginAsSupplier(page);

  for (const route of SUPPLIER_ROUTES) {
    try {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await snap(page, `09-${route.label}`);
      console.log(`✅ ${route.path} → ${page.url()}`);
    } catch (e) {
      console.log(`⚠️ ${route.path} failed: ${e.message}`);
    }
  }
});

test('Visual audit — admin pages', async ({ page }) => {
  if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) {
    test.skip();
  }
  await loginAsSupplier(page);

  for (const route of ADMIN_ROUTES) {
    try {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await snap(page, `09-${route.label}`);
      console.log(`✅ ${route.path} → ${page.url()}`);
    } catch (e) {
      console.log(`⚠️ ${route.path} failed: ${e.message}`);
    }
  }
});