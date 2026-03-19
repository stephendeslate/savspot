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
    await expect(page.locator('#filter-search')).toBeVisible();

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

  test('clicking a booking navigates to booking detail', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Wait for bookings to load
    await expect(
      page.getByRole('heading', { name: 'Bookings', level: 2 }),
    ).toBeVisible();

    // If there are bookings, click the eye icon button in the first row's actions column
    const viewButton = page.locator('table tbody tr').first().getByRole('button').first();

    const hasBookings = await page.getByText('All Bookings').isVisible();
    if (hasBookings) {
      await expect(viewButton).toBeVisible({ timeout: 10_000 });
      await viewButton.click();

      // Should navigate to booking detail page
      await page.waitForURL('**/bookings/**');
      await page.waitForLoadState('networkidle');

      // Booking detail should show relevant info
      await expect(
        page.getByText(/status|client|service|date|time/i).first(),
      ).toBeVisible();
    }
  });

  test('booking detail page shows client and service info', async ({ page }) => {
    // Navigate to a known booking (Tony Stark's Haircut - CONFIRMED)
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    const hasBookings = await page.getByText('All Bookings').isVisible();
    if (!hasBookings) {
      test.skip();
      return;
    }

    // Click the eye icon button in the first row's actions column
    const viewButton = page.locator('table tbody tr').first().getByRole('button').first();
    await viewButton.click();

    await page.waitForURL('**/bookings/**');
    await page.waitForLoadState('networkidle');

    // Should show client info section
    await expect(
      page.getByText(/client/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Should show service info
    await expect(
      page.getByText(/service/i).first(),
    ).toBeVisible();
  });

  test('booking detail page shows action buttons based on status', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    const hasBookings = await page.getByText('All Bookings').isVisible();
    if (!hasBookings) {
      test.skip();
      return;
    }

    // Click the eye icon button in the first row's actions column
    const viewButton = page.locator('table tbody tr').first().getByRole('button').first();
    await viewButton.click();

    await page.waitForURL('**/bookings/**');
    await page.waitForLoadState('networkidle');

    // Depending on booking status, action buttons should be visible
    // For CONFIRMED bookings: Cancel, Reschedule, No-Show
    // For PENDING bookings: Confirm, Cancel
    const actionButton = page.getByRole('button', { name: /confirm|cancel|reschedule|no.show|mark.*paid/i });
    await expect(actionButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test('booking detail page has notes section', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    const hasBookings = await page.getByText('All Bookings').isVisible();
    if (!hasBookings) {
      test.skip();
      return;
    }

    // Click the eye icon button in the first row's actions column
    const viewButton = page.locator('table tbody tr').first().getByRole('button').first();
    await viewButton.click();

    await page.waitForURL('**/bookings/**');
    await page.waitForLoadState('networkidle');

    // Notes section should be present
    await expect(
      page.getByText(/notes/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('booking detail page has back button', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    const hasBookings = await page.getByText('All Bookings').isVisible();
    if (!hasBookings) {
      test.skip();
      return;
    }

    // Click the eye icon button in the first row's actions column
    const viewButton = page.locator('table tbody tr').first().getByRole('button').first();
    await viewButton.click();

    await page.waitForURL('**/bookings/**');
    await page.waitForLoadState('networkidle');

    // Back button should be visible
    const backButton = page.locator('button').filter({
      has: page.locator('svg.lucide-arrow-left'),
    }).or(page.getByRole('link', { name: /back/i }));

    await expect(backButton.first()).toBeVisible();
    await backButton.first().click();

    // Should navigate back to bookings list
    await page.waitForURL('**/bookings');
  });

  test('walk-in button opens walk-in dialog', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Bookings', level: 2 }),
    ).toBeVisible();

    // Click walk-in button
    const walkInButton = page.getByRole('button', { name: /walk-in/i });
    await expect(walkInButton).toBeVisible();
    await walkInButton.click();

    // Dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('bookings filter by status', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/manage and track all your bookings/i),
    ).toBeVisible();

    // Open filters if collapsed (mobile)
    const filtersToggle = page.getByRole('button', { name: /filters/i });
    if (await filtersToggle.isVisible()) {
      await filtersToggle.click();
    }

    // Select a status filter
    const statusSelect = page.locator('#filter-status');
    await expect(statusSelect).toBeVisible();

    // Select "Confirmed" status — try native select first, fall back to shadcn Select
    const tagName = await statusSelect.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await statusSelect.selectOption('CONFIRMED');
    } else {
      await statusSelect.click();
      await page.getByRole('option', { name: /confirmed/i }).click();
    }

    // Click Apply
    await page.getByRole('button', { name: /apply/i }).click();

    await page.waitForLoadState('networkidle');

    // Page should still be valid (either filtered results or empty state)
    await expect(
      page.getByText('All Bookings').or(page.getByText(/no bookings/i)),
    ).toBeVisible({ timeout: 10_000 });
  });
});
