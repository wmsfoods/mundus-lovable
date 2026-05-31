export async function loginAsSupplier(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', process.env.SUPPLIER_EMAIL || '');
  await page.fill('input[type="password"], input[name="password"]', process.env.SUPPLIER_PASSWORD || '');

  // Click login button
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")');

  // Wait for navigation away from login page (any URL that is not /login)
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle');

  console.log('Logged in, current URL:', page.url());
}

export async function snap(page, label) {
  const { mkdirSync } = await import('fs');
  mkdirSync('screenshots', { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `screenshots/${label}-${ts}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 ${path}`);
}