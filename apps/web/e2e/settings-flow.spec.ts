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
    'Team',
    'Embed Widget',
  ];

  test('settings page loads and shows all settings cards', async ({
    page,
  }) => {
    await page.goto('/settings');

    // Page heading
    const heading = page.getByRole('heading', { name: 'Settings' });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Subtitle text
    await expect(
      page.getByText(/manage your account and business settings/i),
    ).toBeVisible();

    // Verify each settings card is present
    for (const sectionName of EXPECTED_SETTINGS_SECTIONS) {
      await expect(page.getByText(sectionName, { exact: true })).toBeVisible();
    }
  });

  test('clicking "Team" card navigates to team settings page', async ({
    page,
  }) => {
    await page.goto('/settings');

    // Wait for cards to render
    await expect(
      page.getByText('Team', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    // Click the Team card link
    await page.getByText('Team', { exact: true }).click();

    // Should navigate to /settings/team
    await page.waitForURL('/settings/team', { timeout: 10_000 });

    // The team page should show a heading
    await expect(
      page.getByRole('heading', { name: 'Team' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('clicking "Branding" card navigates to branding settings', async ({
    page,
  }) => {
    await page.goto('/settings');

    // Wait for cards to render
    await expect(
      page.getByText('Branding', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    // Click the Branding card link
    await page.getByText('Branding', { exact: true }).click();

    // Should navigate to /settings/branding
    await page.waitForURL('/settings/branding', { timeout: 10_000 });
  });

  test('settings cards have descriptive text', async ({ page }) => {
    await page.goto('/settings');

    // Wait for the page to render
    await expect(
      page.getByRole('heading', { name: 'Settings' }),
    ).toBeVisible({ timeout: 15_000 });

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
