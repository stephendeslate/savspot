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
    'Workflows',
    'Communications',
    'Venues',
    'Referrals',
    'Accounting',
    'Custom Domains',
    'Billing & Plans',
    'Service Categories',
    'API Keys',
    'Notification Preferences',
    'Voice & Telephony',
    'Partner Program',
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

  // --- Settings sub-page navigation tests ---

  const settingsSubPages = [
    { card: 'Business Profile', url: '/settings/profile', heading: /profile|business/i },
    { card: 'Availability', url: '/settings/availability', heading: /availability/i },
    { card: 'Payments', url: '/settings/payments', heading: /payments?/i },
    { card: 'Calendar', url: '/settings/calendar', heading: /calendar/i },
    { card: 'Notifications', url: '/settings/notifications', heading: /notifications?/i },
    { card: 'Discounts', url: '/settings/discounts', heading: /discounts?/i },
    { card: 'Tax Rates', url: '/settings/tax-rates', heading: /tax/i },
    { card: 'Gallery', url: '/settings/gallery', heading: /gallery/i },
    { card: 'Booking Flow', url: '/settings/booking-flow', heading: /booking/i },
    { card: 'Embed Widget', url: '/settings/embed', heading: /embed/i },
    { card: 'Workflows', url: '/settings/workflows', heading: /workflows?/i },
    { card: 'Communications', url: '/settings/communications', heading: /communications?/i },
    { card: 'Venues', url: '/settings/venues', heading: /venues?/i },
    { card: 'Referrals', url: '/settings/referrals', heading: /referrals?/i },
    { card: 'Accounting', url: '/settings/accounting', heading: /accounting/i },
    { card: 'Custom Domains', url: '/settings/domains', heading: /domains?/i },
    { card: 'Billing & Plans', url: '/settings/billing', heading: /billing|plans?/i },
    { card: 'Service Categories', url: '/settings/service-categories', heading: /categor/i },
    { card: 'API Keys', url: '/settings/api-keys', heading: /api/i },
    { card: 'Notification Preferences', url: '/settings/notification-preferences', heading: /notification.*pref/i },
    { card: 'Voice & Telephony', url: '/settings/voice', heading: /voice|telephony/i },
    { card: 'Partner Program', url: '/settings/partner-program', heading: /partner/i },
  ];

  for (const { card, url, heading } of settingsSubPages) {
    test(`navigating to "${card}" settings page loads correctly`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Each settings sub-page should show its heading
      await expect(
        page.getByRole('heading', { name: heading }).first(),
      ).toBeVisible({ timeout: 15_000 });
    });
  }

  test('profile settings page has form fields', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');

    // Profile form should have business name field
    await expect(page.getByLabel(/name/i).first()).toBeVisible({ timeout: 10_000 });

    // Should have a save/update button
    const saveButton = page.getByRole('button', { name: /save|update/i });
    await expect(saveButton.first()).toBeVisible();
  });

  test('availability settings page shows schedule', async ({ page }) => {
    await page.goto('/settings/availability');
    await page.waitForLoadState('networkidle');

    // Should show day-of-week schedule or availability rules
    await expect(
      page.getByText(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('billing settings page shows current plan', async ({ page }) => {
    await page.goto('/settings/billing');
    await page.waitForLoadState('networkidle');

    // Should show current plan info (FREE tier for seed data)
    await expect(
      page.getByText(/free|current plan|starter/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('discounts settings page has create button', async ({ page }) => {
    await page.goto('/settings/discounts');
    await page.waitForLoadState('networkidle');

    // Should have a button to create a discount/promo code
    const createButton = page.getByRole('button', { name: /create|add|new/i })
      .or(page.getByRole('link', { name: /create|add|new/i }));
    await expect(createButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test('settings sub-pages have back navigation', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');

    // Back button should be visible (arrow-left icon button or back link)
    const backButton = page.locator('button').filter({
      has: page.locator('svg.lucide-arrow-left'),
    }).or(page.getByRole('link', { name: /back|settings/i }));

    await expect(backButton.first()).toBeVisible({ timeout: 10_000 });
  });
});
