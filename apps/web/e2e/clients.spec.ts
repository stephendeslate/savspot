import { test, expect } from '@playwright/test';

/**
 * Client Management E2E Tests
 *
 * Tests client listing and detail pages at /clients and /clients/[id].
 * Uses authenticated storageState from auth.setup.ts.
 *
 * NOTE: The seed data may not create explicit client records for every tenant.
 * The clients page shows "No clients yet" when there are no bookings with
 * associated client records. Tests account for this empty state.
 */
test.describe('Client Management', () => {
  test('clients page loads with heading', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /clients/i, level: 2 }),
    ).toBeVisible();
  });

  test('clients page shows search input', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('#client-search');
    await expect(searchInput).toBeVisible();
  });

  test('clients page shows sort controls', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const sortControl = page.locator('#client-sort');
    await expect(sortControl).toBeVisible({ timeout: 10_000 });
  });

  test('clients page displays client list or empty state', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main');
    // Either client cards exist or the empty state message is shown
    const hasContent = mainContent.getByText(/no clients/i)
      .or(mainContent.locator('[data-testid="client-card"]'))
      .or(mainContent.locator('table'));

    await expect(hasContent.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clients search input is functional', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('#client-search');
    await expect(searchInput).toBeVisible();

    // Type a search query and verify input accepts it
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');

    // Wait for search to trigger
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Page should still be rendered (no crash)
    await expect(page.locator('main')).toBeVisible();
  });

  test('clients page has correct page structure', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    // Page should have heading, search, sort, and main content area
    await expect(
      page.getByRole('heading', { name: /clients/i, level: 2 }),
    ).toBeVisible();
    await expect(page.locator('#client-search')).toBeVisible();
    await expect(page.locator('#client-sort')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    // Main content should have meaningful text
    const bodyText = await page.locator('main').textContent();
    expect(bodyText!.length).toBeGreaterThan(20);
  });
});
