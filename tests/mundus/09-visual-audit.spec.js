import { test } from '@playwright/test';
import { loginAsSupplier, snap } from '../helpers/auth.js';

const ROUTES = [
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

test('Visual audit — all pages', async ({ page }) => {
  if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) {
    test.skip();
  }
  await loginAsSupplier(page);
  for (const route of ROUTES) {
    await page.goto(route.path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await snap(page, `09-${route.label}`);
    console.log(`✅ ${route.path}`);
  }
});