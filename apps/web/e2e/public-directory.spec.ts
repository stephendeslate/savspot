import { test, expect } from '@playwright/test';
import { TEST_TENANT } from './fixtures/test-data';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Public Directory', () => {
  // Skip: directory API endpoints (/api/directory/search, /api/directory/categories) not implemented yet
  test.skip();
  test('directory page loads with heading', async ({ page }) => {
    await page.goto('/directory');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /directory|browse|find/i }),
    ).toBeVisible();
  });

  test('directory shows search input', async ({ page }) => {
    await page.goto('/directory');
    await page.waitForLoadState('networkidle');

    // Search input should be visible
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('directory displays business cards', async ({ page }) => {
    await page.goto('/directory');
    await page.waitForLoadState('networkidle');

    // At least one business card should be visible (3 seeded tenants)
    await expect(
      page.getByText(TEST_TENANT.name),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('directory search filters results', async ({ page }) => {
    await page.goto('/directory');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Search for a specific business
    await searchInput.fill('Smooth Cuts');

    // Wait for search to update (debounced)
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // The searched business should be visible
    await expect(page.getByText(TEST_TENANT.name)).toBeVisible();
  });

  test('directory shows category filters', async ({ page }) => {
    await page.goto('/directory');
    await page.waitForLoadState('networkidle');

    // Category filter buttons should exist (seeded categories: SALON, FITNESS, VENUE)
    const filterSection = page.getByRole('button', { name: /all/i })
      .or(page.getByRole('button', { name: /salon/i }))
      .or(page.locator('[data-testid="category-filter"]'));

    await expect(filterSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking business card navigates to business profile', async ({ page }) => {
    await page.goto('/directory');
    await page.waitForLoadState('networkidle');

    // Click on the business name/link
    const businessLink = page.getByRole('link', { name: TEST_TENANT.name }).or(
      page.getByText(TEST_TENANT.name),
    );
    await expect(businessLink.first()).toBeVisible({ timeout: 10_000 });
    await businessLink.first().click();

    // Should navigate to the business profile page
    await page.waitForURL(`**/directory/${TEST_TENANT.slug}`);
  });

  test('business profile page shows business details', async ({ page }) => {
    await page.goto(`/directory/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // Business name should be visible
    await expect(
      page.getByRole('heading', { name: TEST_TENANT.name }),
    ).toBeVisible();
  });

  test('business profile shows services', async ({ page }) => {
    await page.goto(`/directory/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // Services section should be visible with seeded services
    await expect(
      page.getByText(/services/i),
    ).toBeVisible();

    // At least one seeded service should be visible
    await expect(
      page.getByText('Haircut').or(page.getByText('Beard Trim')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('business profile has book now action', async ({ page }) => {
    await page.goto(`/directory/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // A "Book Now" or booking link should exist
    const bookAction = page.getByRole('link', { name: /book/i })
      .or(page.getByRole('button', { name: /book/i }));
    await expect(bookAction.first()).toBeVisible();
  });

  test('directory shows 404 for invalid business slug', async ({ page }) => {
    await page.goto('/directory/nonexistent-business-xyz');
    await page.waitForLoadState('networkidle');

    // Should show a not found or error state
    await expect(
      page.getByText(/not found|doesn't exist|no business/i),
    ).toBeVisible();
  });
});
