export async function loginAsSupplier(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input[name="email"]', process.env.SUPPLIER_EMAIL || '');
  await page.fill('input[type="password"], input[name="password"]', process.env.SUPPLIER_PASSWORD || '');
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
  await page.waitForURL('**/home', { timeout: 15000 });
}

export async function snap(page, label) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `screenshots/${label}-${ts}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 ${path}`);
}