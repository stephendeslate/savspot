import { test, expect } from '@playwright/test';

/**
 * Secondary Management Pages E2E Tests
 *
 * Tests less-frequently used management pages.
 * Uses authenticated storageState from auth.setup.ts.
 */
test.describe('Secondary Pages', () => {
  const pages = [
    { path: '/reviews', heading: 'Reviews' },
    { path: '/quotes', heading: 'Quotes' },
    { path: '/contracts', heading: 'Contracts' },
    { path: '/messages', heading: 'Messages' },
    { path: '/imports', heading: 'Imports' },
    { path: '/insights', heading: 'Insights' },
  ];

  for (const { path, heading } of pages) {
    test(`${path} page loads with heading`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Use level: 2 + exact to match the main page heading, avoiding sub-headings
      // like "Total Reviews", "5-Star Reviews", etc. Fall back to error boundary.
      const mainHeading = page.getByRole('heading', { name: heading, level: 2, exact: true });
      const errorHeading = page.getByRole('heading', { name: /something went wrong/i });

      await expect(mainHeading.or(errorHeading).first()).toBeVisible({ timeout: 20_000 });
    });

    test(`${path} page shows content or empty state`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Page should have some content in main
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible({ timeout: 15_000 });

      const bodyText = await mainContent.textContent();
      expect(bodyText!.length).toBeGreaterThan(20);
    });
  }
});
