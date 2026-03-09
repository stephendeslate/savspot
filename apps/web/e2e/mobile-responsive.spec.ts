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

    // The tenant name heading should be visible on mobile
    const heading = page.getByRole('heading', {
      level: 1,
      name: TEST_TENANT.name,
    });
    await expect(heading).toBeVisible({ timeout: 15_000 });

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

    // On mobile viewports, the sidebar is hidden and a hamburger
    // menu button (aria-label "Open menu") is visible instead
    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible({ timeout: 15_000 });

    // Click the hamburger menu to open the mobile navigation
    await menuButton.click();

    // The mobile nav slide-over should become visible with navigation items
    // Use getByRole('link') to avoid matching h1 headings with the same text
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bookings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Services' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    // A close menu button should be available
    const closeButton = page.getByRole('button', { name: /close menu/i });
    await expect(closeButton).toBeVisible();

    // Close the menu
    await closeButton.click();
  });

  test('calendar defaults to agenda view on mobile', async ({ page }) => {
    await page.goto('/calendar');

    // The calendar heading should be visible
    await expect(
      page.getByRole('heading', { name: 'Calendar' }),
    ).toBeVisible({ timeout: 15_000 });

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
});
