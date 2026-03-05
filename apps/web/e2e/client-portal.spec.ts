import { test, expect } from '@playwright/test';

/**
 * Client Portal E2E Tests
 *
 * These tests verify the client portal pages at /portal/*.
 * They use the authenticated storageState from auth.setup.ts.
 *
 * NOTE: The portal uses the same auth system as the admin dashboard,
 * so the storageState from auth.setup is reused here. In production,
 * a client would log in via a separate flow, but for E2E purposes
 * the shared authenticated session suffices to test page rendering.
 *
 * Requires the full dev server (API + web) to be running.
 */
test.describe('Client Portal', () => {
  test('portal dashboard loads with welcome heading', async ({ page }) => {
    await page.goto('/portal');

    // The portal dashboard should show a welcome heading or the Dashboard heading
    const welcomeHeading = page.getByRole('heading', {
      name: /welcome back|dashboard/i,
    });
    await expect(welcomeHeading).toBeVisible({ timeout: 15_000 });
  });

  test('portal navbar displays navigation links', async ({ page }) => {
    await page.goto('/portal');

    // Wait for portal to load
    await expect(
      page.getByRole('heading', { name: /welcome back|dashboard/i }),
    ).toBeVisible({ timeout: 15_000 });

    // The portal navbar should contain these navigation links
    const nav = page.locator('header');
    await expect(nav.getByText('Dashboard')).toBeVisible();
    await expect(nav.getByText('Bookings')).toBeVisible();
    await expect(nav.getByText('Payments')).toBeVisible();
    await expect(nav.getByText('Profile')).toBeVisible();

    // The SavSpot logo/text should be in the header
    await expect(nav.getByText('SavSpot')).toBeVisible();
  });

  test('portal bookings page loads', async ({ page }) => {
    await page.goto('/portal/bookings');

    // The page should render — either bookings list or empty state
    // Look for common elements that appear on the bookings page
    const heading = page.getByRole('heading', {
      name: /bookings|my bookings|upcoming/i,
    });
    const emptyState = page.getByText(/no.*bookings/i);

    await expect(heading.or(emptyState)).toBeVisible({ timeout: 15_000 });
  });

  test('portal profile page loads', async ({ page }) => {
    await page.goto('/portal/profile');

    // The profile page should be accessible and show profile-related content
    const heading = page.getByRole('heading', {
      name: /profile/i,
    });
    const profileContent = page.getByText(/email|name|phone/i);

    await expect(heading.or(profileContent)).toBeVisible({
      timeout: 15_000,
    });
  });
});
