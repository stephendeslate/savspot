import { test, expect } from '@playwright/test';

/**
 * Bookings Management E2E Tests
 *
 * These tests verify the admin bookings page at /bookings.
 * They use the authenticated storageState from auth.setup.ts
 * so the user is already logged in.
 *
 * Requires the full dev server (API + web) to be running with seeded data.
 */
test.describe('Bookings Management', () => {
  test('bookings page loads with heading and walk-in button', async ({
    page,
  }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // The page should display the "Bookings" heading (h2 is the page title)
    const heading = page.getByRole('heading', { name: 'Bookings', level: 2 });
    await expect(heading).toBeVisible();

    // The descriptive subtitle should be present
    await expect(
      page.getByText(/manage and track all your bookings/i),
    ).toBeVisible();

    // The "Walk-in" button should be available
    const walkInButton = page.getByRole('button', { name: /walk-in/i });
    await expect(walkInButton).toBeVisible();
  });

  test('bookings page shows filter controls', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await expect(
      page.getByText(/manage and track all your bookings/i),
    ).toBeVisible();

    // On mobile viewports, filters are collapsed behind a toggle button
    const filtersToggle = page.getByRole('button', { name: /filters/i });
    if (await filtersToggle.isVisible()) {
      await filtersToggle.click();
    }

    // The filter controls should now be visible
    await expect(page.getByLabel(/status/i)).toBeVisible();
    await expect(page.getByLabel(/start date/i)).toBeVisible();
    await expect(page.getByLabel(/end date/i)).toBeVisible();
    await expect(page.getByLabel(/search/i)).toBeVisible();

    // An "Apply" button should exist for the filters
    await expect(
      page.getByRole('button', { name: /apply/i }),
    ).toBeVisible();
  });

  test('bookings table or empty state is displayed', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Wait for loading to complete
    await expect(
      page.getByRole('heading', { name: 'Bookings', level: 2 }),
    ).toBeVisible();

    // Either the "All Bookings" card title appears (with a table),
    // or the "No bookings yet" empty state appears
    const allBookingsHeader = page.getByText('All Bookings');
    const emptyState = page.getByText(/no bookings yet/i);

    // One of these should be visible
    await expect(allBookingsHeader.or(emptyState)).toBeVisible();
  });
});
