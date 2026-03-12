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
    await page.waitForLoadState('networkidle');

    // The portal dashboard should show a welcome heading or the Dashboard heading
    const welcomeHeading = page.getByRole('heading', {
      name: /welcome back|dashboard/i,
    });
    await expect(welcomeHeading).toBeVisible();
  });

  test('portal navbar displays navigation links', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    // Wait for portal to load
    await expect(
      page.getByRole('heading', { name: /welcome back|dashboard/i }),
    ).toBeVisible();

    // Open mobile menu if needed (hamburger visible on small viewports)
    const menuButton = page.getByRole('button', { name: /toggle menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
      // Wait for mobile menu to appear
      await expect(
        page.getByRole('link', { name: 'Dashboard' }),
      ).toBeVisible();
    }

    // Check all navigation links are visible
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bookings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Payments' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();

    // The SavSpot logo/text should be in the header
    await expect(page.locator('header').getByText('SavSpot')).toBeVisible();
  });

  test('portal bookings page loads', async ({ page }) => {
    await page.goto('/portal/bookings');
    await page.waitForLoadState('networkidle');

    // The portal bookings page has an h1 "My Bookings"
    await expect(
      page.getByRole('heading', { level: 1, name: /my bookings/i }),
    ).toBeVisible();
  });

  test('portal profile page loads', async ({ page }) => {
    await page.goto('/portal/profile');
    await page.waitForLoadState('networkidle');

    // The portal profile page has an h1 "My Profile"
    await expect(
      page.getByRole('heading', { level: 1, name: /my profile/i }),
    ).toBeVisible();
  });
});
