import { test, expect } from '@playwright/test';

/**
 * Settings Navigation E2E Tests
 *
 * These tests verify the settings index page and navigation to sub-pages.
 * They use the authenticated storageState from auth.setup.ts.
 *
 * Requires the full dev server (API + web) to be running.
 */
test.describe('Settings Navigation', () => {
  const EXPECTED_SETTINGS_SECTIONS = [
    'Business Profile',
    'Availability',
    'Payments',
    'Calendar',
    'Notifications',
    'Branding',
    'Discounts',
    'Tax Rates',
    'Gallery',
    'Team',
    'Booking Flow',
    'Embed Widget',
  ];

  test('settings page loads and shows all settings cards', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Page heading
    const heading = page.getByRole('heading', { level: 2, name: 'Settings' });
    await expect(heading).toBeVisible();

    // Subtitle text
    await expect(
      page.getByText(/manage your account and business settings/i),
    ).toBeVisible();

    // Verify each settings card is present
    for (const sectionName of EXPECTED_SETTINGS_SECTIONS) {
      await expect(page.getByRole('heading', { name: sectionName })).toBeVisible();
    }
  });

  test('clicking "Team" card navigates to team settings page', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for cards to render
    await expect(
      page.getByRole('heading', { name: 'Team' }),
    ).toBeVisible();

    // Click the Team card link
    await page.getByRole('heading', { name: 'Team' }).click();

    // Should navigate to /settings/team
    await page.waitForURL('**/settings/team');
    await page.waitForLoadState('networkidle');

    // The team page should show a heading
    await expect(
      page.getByRole('heading', { level: 2, name: 'Team' }),
    ).toBeVisible();
  });

  test('clicking "Branding" card navigates to branding settings', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for cards to render
    await expect(
      page.getByRole('heading', { name: 'Branding' }),
    ).toBeVisible();

    // Click the Branding card link
    await page.getByRole('heading', { name: 'Branding' }).click();

    // Should navigate to /settings/branding
    await page.waitForURL('**/settings/branding');
  });

  test('settings cards have descriptive text', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Wait for the page to render
    await expect(
      page.getByRole('heading', { level: 2, name: 'Settings' }),
    ).toBeVisible();

    // Verify descriptions for a subset of settings cards
    await expect(
      page.getByText(/update your business information/i),
    ).toBeVisible();
    await expect(
      page.getByText(/connect stripe to accept online payments/i),
    ).toBeVisible();
    await expect(
      page.getByText(/invite and manage team members/i),
    ).toBeVisible();
    await expect(
      page.getByText(/add a "book now" button to your website/i),
    ).toBeVisible();
  });
});
