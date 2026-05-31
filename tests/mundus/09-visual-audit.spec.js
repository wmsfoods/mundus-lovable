import { test, expect } from '@playwright/test';
import { loginAsSupplier } from '../helpers/auth.js';

// ─── SUPPLIER AUDIT ───────────────────────────────────────────────
test.describe('Supplier Audit', () => {

  test.beforeEach(async ({ page }) => {
    if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
    await loginAsSupplier(page);
  });

  test('Home dashboard loads with KPI cards', async ({ page }) => {
    await page.goto('/supplier');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Active Offers')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Offers')).toBeVisible();
    await expect(page.locator('text=In Negotiation')).toBeVisible();
  });

  test('Offers page loads and has Create Offer button', async ({ page }) => {
    await page.goto('/supplier/offers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Offers').first()).toBeVisible();
    await expect(page.locator('button:has-text("Create Offer"), a:has-text("Create Offer")')).toBeVisible();
  });

  test('Create Offer wizard opens and shows Unit step', async ({ page }) => {
    await page.goto('/supplier/offers');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Create Offer"), a:has-text("Create Offer")');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('text=Select Weight Unit').or(page.locator('text=Unit'))
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=kg').first()).toBeVisible();
    await expect(page.locator('text=lbs').first()).toBeVisible();
  });

  test('Offer Requests page loads with all columns', async ({ page }) => {
    await page.goto('/supplier/requests');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=My offer requests')).toBeVisible();
    await expect(page.locator('text=REQUEST NUMBER')).toBeVisible();
    await expect(page.locator('text=INCOTERMS')).toBeVisible();
    await expect(page.locator('text=STATUS')).toBeVisible();
  });

  test('Sales page loads with status badges', async ({ page }) => {
    await page.goto('/supplier/sales');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Sales').first()).toBeVisible();
    await expect(
      page.locator('text=DEAL ID').or(page.locator('text=Track your orders'))
    ).toBeVisible();
  });

  test('Negotiations page loads', async ({ page }) => {
    await page.goto('/supplier/negotiations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Negotiations').first()).toBeVisible();
  });

  test('Users page loads with Invite User button', async ({ page }) => {
    await page.goto('/supplier/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Users').first()).toBeVisible();
    await expect(page.locator('button:has-text("Invite User")')).toBeVisible();
  });

  test('Mundus Intel section visible in sidebar', async ({ page }) => {
    await page.goto('/supplier');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Mundus Intel')).toBeVisible();
    await expect(page.locator('text=Price Benchmark')).toBeVisible();
    await expect(page.locator('text=Market Intelligence')).toBeVisible();
    await expect(page.locator('text=Cut Comparison')).toBeVisible();
  });

  test('No broken routes — none should show 404', async ({ page }) => {
    const routes = [
      '/supplier', '/supplier/offers',
      '/supplier/requests', '/supplier/sales',
      '/supplier/negotiations', '/supplier/users',
    ];
    const broken = [];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const is404 = await page
        .locator('text=404')
        .or(page.locator('text=Not Found'))
        .or(page.locator('text=Page not found'))
        .isVisible();
      if (is404) broken.push(route);
    }
    expect(broken, `Broken routes: ${broken.join(', ')}`).toHaveLength(0);
  });

});

// ─── BUYER AUDIT ──────────────────────────────────────────────────
test.describe('Buyer Audit', () => {

  test.beforeEach(async ({ page }) => {
    if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
    await loginAsSupplier(page);
  });

  test('Buyer home loads', async ({ page }) => {
    await page.goto('/buyer');
    await page.waitForLoadState('networkidle');
    const is404 = await page
      .locator('text=404')
      .or(page.locator('text=Not Found'))
      .or(page.locator('text=Page not found'))
      .isVisible();
    expect(is404).toBe(false);
  });

  test('Buyer offers page loads', async ({ page }) => {
    await page.goto('/buyer/offers');
    await page.waitForLoadState('networkidle');
    const is404 = await page
      .locator('text=404')
      .or(page.locator('text=Not Found'))
      .or(page.locator('text=Page not found'))
      .isVisible();
    expect(is404).toBe(false);
  });

  test('Buyer negotiations page loads', async ({ page }) => {
    await page.goto('/buyer/negotiations');
    await page.waitForLoadState('networkidle');
    const is404 = await page
      .locator('text=404')
      .or(page.locator('text=Not Found'))
      .or(page.locator('text=Page not found'))
      .isVisible();
    expect(is404).toBe(false);
  });

  test('No broken buyer routes', async ({ page }) => {
    const routes = [
      '/buyer', '/buyer/offers', '/buyer/requests',
      '/buyer/negotiations', '/buyer/orders', '/buyer/users',
    ];
    const broken = [];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const is404 = await page
        .locator('text=404')
        .or(page.locator('text=Not Found'))
        .or(page.locator('text=Page not found'))
        .isVisible();
      if (is404) broken.push(route);
      console.log(`${is404 ? '❌' : '✅'} ${route}`);
    }
    expect(broken, `Broken buyer routes: ${broken.join(', ')}`).toHaveLength(0);
  });

});

// ─── ADMIN AUDIT ──────────────────────────────────────────────────
test.describe('Admin Audit', () => {

  test.beforeEach(async ({ page }) => {
    if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
    await loginAsSupplier(page);
  });

  test('Admin dashboard loads with metrics', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    const is404 = await page
      .locator('text=404')
      .or(page.locator('text=Not Found'))
      .or(page.locator('text=Page not found'))
      .isVisible();
    expect(is404).toBe(false);
  });

  test('No broken admin routes', async ({ page }) => {
    const routes = [
      '/admin/dashboard', '/admin/settings/team', '/admin/companies',
      '/admin/offers', '/admin/negotiations', '/admin/deals',
    ];
    const broken = [];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const is404 = await page
        .locator('text=404')
        .or(page.locator('text=Not Found'))
        .or(page.locator('text=Page not found'))
        .isVisible();
      if (is404) broken.push(route);
      console.log(`${is404 ? '❌' : '✅'} ${route}`);
    }
    expect(broken, `Broken admin routes: ${broken.join(', ')}`).toHaveLength(0);
  });

});

// ─── STRIPE / PRO GATE AUDIT ──────────────────────────────────────
test.describe('PRO Gate Audit', () => {

  test.beforeEach(async ({ page }) => {
    if (!process.env.SUPPLIER_EMAIL || !process.env.SUPPLIER_PASSWORD) test.skip();
    await loginAsSupplier(page);
  });

  test('Price Benchmark route renders something', async ({ page }) => {
    await page.goto('/supplier/insights/price-benchmark');
    await page.waitForLoadState('networkidle');
    const is404 = await page.locator('text=404').isVisible();
    expect(is404).toBe(false);
  });

  test('Analytics route renders something', async ({ page }) => {
    await page.goto('/supplier/insights/analytics');
    await page.waitForLoadState('networkidle');
    const is404 = await page.locator('text=404').isVisible();
    expect(is404).toBe(false);
  });

  test('Cut Comparison route renders something', async ({ page }) => {
    await page.goto('/supplier/insights/cut-comparison');
    await page.waitForLoadState('networkidle');
    const is404 = await page.locator('text=404').isVisible();
    expect(is404).toBe(false);
  });

});
