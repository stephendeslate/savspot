import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Legal Pages', () => {
  test('privacy policy page loads with heading', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');

    // Should display a privacy-related heading
    await expect(
      page.getByRole('heading', { name: /privacy/i }),
    ).toBeVisible();
  });

  test('privacy page has content', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');

    // Page should have substantive content (not just a heading)
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Should contain privacy-related text
    const bodyText = await mainContent.textContent();
    expect(bodyText!.length).toBeGreaterThan(50);
  });

  test('terms of service page loads with heading', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');

    // Should display a terms-related heading
    await expect(
      page.getByRole('heading', { name: /terms/i }),
    ).toBeVisible();
  });

  test('terms page has content', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    const bodyText = await mainContent.textContent();
    expect(bodyText!.length).toBeGreaterThan(50);
  });
});
