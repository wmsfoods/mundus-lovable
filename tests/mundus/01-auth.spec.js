import { test, expect } from '@playwright/test';
import { snap } from '../helpers/auth.js';

test.describe('Authentication', () => {
  test('Login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await snap(page, '01-login-page');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Sign in")');
    await page.waitForTimeout(3000);
    await snap(page, '01-login-error');
    expect(page.url()).toContain('login');
  });
});