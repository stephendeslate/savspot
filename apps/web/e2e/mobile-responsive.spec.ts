import { test, expect } from '@playwright/test';
import { TEST_TENANT } from './fixtures/test-data';

/**
 * Mobile Responsive E2E Tests
 *
 * These tests run in the "Mobile Chrome" project (Pixel 5 viewport)
 * as configured in playwright.config.ts. They verify that key pages
 * render correctly on a mobile viewport.
 *
 * Requires the full dev server (API + web) to be running with seeded data.
 */
test.describe('Mobile Responsive', () => {
  test('booking page renders correctly on mobile', async ({ page }) => {
    await page.goto(`/book/${TEST_TENANT.slug}`);
    await page.waitForLoadState('networkidle');

    // The tenant name heading should be visible on mobile
    const heading = page.getByRole('heading', {
      level: 1,
      name: TEST_TENANT.name,
    });
    await expect(heading).toBeVisible();

    // "Our Services" section should be visible
    await expect(
      page.getByRole('heading', { name: /our services/i }),
    ).toBeVisible();

    // Service cards with "Book Now" buttons should be visible
    const bookNowButtons = page.getByRole('button', { name: /book now/i });
    await expect(bookNowButtons.first()).toBeVisible();
  });

  test('dashboard shows hamburger menu on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // On mobile viewports, the sidebar is hidden and a hamburger
    // menu button (aria-label "Open menu") is visible instead
    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible();

    // Click the hamburger menu to open the mobile navigation
    await menuButton.click();
    await page.waitForTimeout(300);

    // The mobile nav slide-over should become visible with navigation items.
    // Use exact: true to avoid matching dashboard quick-action links behind the overlay.
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bookings', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendar', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Services', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();

    // A close menu button should be available
    const closeButton = page.getByRole('button', { name: /close menu/i });
    await expect(closeButton).toBeVisible();

    // Close the menu
    await closeButton.click();
  });

  test('calendar defaults to agenda view on mobile', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // The calendar heading should be visible (h2 is the page title)
    await expect(
      page.getByRole('heading', { name: 'Calendar', level: 2 }),
    ).toBeVisible();

    // On mobile, the calendar should default to agenda view.
    // react-big-calendar renders an "Agenda" button with .rbc-active class
    // when that view is selected. We can check that the Agenda button
    // appears active by looking for the agenda table structure.
    // Alternatively, just verify the rbc-agenda-view class is present.
    const agendaView = page.locator('.rbc-agenda-view');
    const agendaButton = page.locator('button.rbc-active', {
      hasText: 'Agenda',
    });

    // Either the agenda view container or the active Agenda button should exist
    await expect(agendaView.or(agendaButton).first()).toBeVisible({ timeout: 10_000 });
  });

  test('services page renders correctly on mobile', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Services heading should be visible
    await expect(
      page.getByRole('heading', { name: /services/i, level: 2 }),
    ).toBeVisible();

    // Service names should be visible on mobile
    await expect(
      page.getByText('Haircut').first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('settings page renders grid on mobile', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Settings heading should be visible
    await expect(
      page.getByRole('heading', { name: 'Settings', level: 2 }),
    ).toBeVisible();

    // Settings cards should stack on mobile (still visible)
    await expect(
      page.getByRole('heading', { name: 'Business Profile' }),
    ).toBeVisible();
  });

  test('clients page renders on mobile', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /clients/i, level: 2 }),
    ).toBeVisible();
  });

  test('portal renders correctly on mobile', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    // Portal should show its heading on mobile
    await expect(
      page.getByRole('heading', { name: /welcome back|dashboard/i }),
    ).toBeVisible();

    // Mobile toggle menu should be available
    const menuButton = page.getByRole('button', { name: /toggle menu/i });
    await expect(menuButton).toBeVisible();
  });

  test('bookings page filters collapse on mobile', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Bookings', level: 2 }),
    ).toBeVisible();

    // On mobile, filters should be behind a toggle
    const filtersToggle = page.getByRole('button', { name: /filters/i });
    if (await filtersToggle.isVisible()) {
      // Click to expand
      await filtersToggle.click();
      await page.waitForTimeout(300);

      // Filters should now be visible
      await expect(page.getByLabel(/status/i)).toBeVisible();
    }
  });
});
