import { test, expect } from '@playwright/test';
import { loginAsSupplier } from '../helpers/auth.js';

const ready = (page) => page.waitForLoadState('domcontentloaded');

async function noneAre404(page, routes) {
  const broken = [];
  for (const route of routes) {
    await page.goto(route);
    await ready(page);
    const is404 = await page
      .locator('text=404')
      .or(page.locator('text=Not Found'))
      .or(page.locator('text=Page not found'))
      .first()
      .isVisible()
      .catch(() => false);
    if (is404) broken.push(route);
    console.log(`${is404 ? 'X' : 'OK'} ${route}`);
  }
  return broken;
}

// The signed-in test account logs in via SUPPLIER_EMAIL/SUPPLIER_PASSWORD.
// All three describe blocks reuse that same supplier session.

// --- SUPPLIER AUDIT ---
test.describe('Supplier Audit', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
    await loginAsSupplier(page);
  });

  test('Home dashboard loads with KPI cards', async ({ page }) => {
    await page.goto('/supplier');
    await ready(page);
    await expect(page.locator('text=Active Offers').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Offers').first()).toBeVisible();
    await expect(page.locator('text=In Negotiation').first()).toBeVisible();
    await expect(page.locator('text=Closed Deals').first()).toBeVisible();
  });

  test('Offers page loads and has Create Offer button', async ({ page }) => {
    await page.goto('/supplier/offers');
    await ready(page);
    await expect(page.locator('text=Offers').first()).toBeVisible();
    await expect(
      page.locator('button:has-text("Create Offer"), a:has-text("Create Offer")').first()
    ).toBeVisible();
  });

  test('Create Offer wizard opens and shows Unit step', async ({ page }) => {
    await page.goto('/supplier/offers');
    await ready(page);
    await page.locator('button:has-text("Create Offer"), a:has-text("Create Offer")').first().click();
    await ready(page);
    await expect(
      page.locator('text=Select Weight Unit').or(page.locator('text=Unit')).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=kg').first()).toBeVisible();
    await expect(page.locator('text=lbs').first()).toBeVisible();
  });

  test('Offer Requests page loads with columns', async ({ page }) => {
    await page.goto('/supplier/requests');
    await ready(page);
    await expect(page.getByRole('heading', { name: 'Buyer Requests' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Request' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Incoterm' }).first()).toBeVisible();
  });

  test('Sales page loads', async ({ page }) => {
    await page.goto('/supplier/sales');
    await ready(page);
    await expect(page.getByRole('heading', { name: 'Sales', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Deal ID' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' }).first()).toBeVisible();
  });

  test('Negotiations page loads', async ({ page }) => {
    await page.goto('/supplier/negotiations');
    await ready(page);
    await expect(page.locator('text=Negotiations').first()).toBeVisible();
  });

  test('Users page loads with Invite User button', async ({ page }) => {
    await page.goto('/supplier/users');
    await ready(page);
    await expect(page.locator('text=Users').first()).toBeVisible();
    await expect(page.locator('button:has-text("Invite User")').first()).toBeVisible({ timeout: 10000 });
  });

  test('No broken supplier routes', async ({ page }) => {
    const broken = await noneAre404(page, [
      '/supplier', '/supplier/offers', '/supplier/requests',
      '/supplier/sales', '/supplier/negotiations', '/supplier/users',
    ]);
    expect(broken, `Broken supplier routes: ${broken.join(', ')}`).toHaveLength(0);
  });
});

// --- ADMIN AUDIT (same supplier session is also a platform admin) ---
test.describe('Admin Audit', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
    await loginAsSupplier(page);
  });

  test('No broken admin routes', async ({ page }) => {
    const broken = await noneAre404(page, [
      '/admin/dashboard', '/admin/companies', '/admin/offers',
      '/admin/deals', '/admin/negotiations', '/admin/settings/team',
      '/admin/prospect/companies',
    ]);
    expect(broken, `Broken admin routes: ${broken.join(', ')}`).toHaveLength(0);
  });
});

// --- PRO GATE AUDIT ---
test.describe('PRO Gate Audit', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
    await loginAsSupplier(page);
  });

  for (const route of [
    '/supplier/insights/price-benchmark',
    '/supplier/insights/analytics',
    '/supplier/insights/cut-comparison',
  ]) {
    test(`Insights route renders: ${route}`, async ({ page }) => {
      await page.goto(route);
      await ready(page);
      const is404 = await page.locator('text=404').first().isVisible().catch(() => false);
      expect(is404).toBe(false);
    });
  }
});
